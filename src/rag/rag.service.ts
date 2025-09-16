import { Injectable } from '@nestjs/common';
import { DynamoService } from 'src/dynamo/dynamo.service';
import { GeminiService } from 'src/gemini/gemini.service';
import { RagHelperService } from 'src/rag-helper/rag-helper.service';

@Injectable()
export class RagService {
  constructor(
    private readonly client: DynamoService,
    private readonly helper: RagHelperService,
    private readonly gemini: GeminiService,
  ) {}

  async processAndStoreDocument(text: string, fileName: string) {
    const chunks = this.helper.chunkText(text);
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const vector = await this.gemini.getGeminiEmbedding(chunk);
      const fullHash = this.helper.generateLsh(vector);
      await this.client.storeChunk({
        fileName,
        chunkNo: i,
        textChunk: chunk,
        vector,
        lshHash: fullHash,
      });
    }
    console.log(`Stored ${chunks.length} chunks for ${fileName}`);
  }
  
  async askQuestion(question: string, fileName: string): Promise<string> {
    const intent = await this.gemini.detectUserIntent(question);
    let answer: string;
    let usage;

    if (intent === 'document_question') {
      const qVec = await this.gemini.getGeminiEmbedding(question);
      const lshHash = await this.helper.generateLsh(qVec);
      console.log('full LSH hash:', lshHash);

      const scales = [12, 10, 8, 6];
      let all: any[] = [];

      for (const prefixLength of scales) {
        const probeCount = Math.min(prefixLength, 8);
        const prefixes = await this.helper.generateProbePrefixes(
          lshHash,
          prefixLength,
          probeCount,
        );

        for (const p of prefixes) {
          const items = await this.client.fetchCandidatesByFileAndLshPrefix(
            fileName,
            p,
          );
          all.push(...items);
        }
        const unique = Array.from(
          new Map(all.map((it) => [it.SK, it])).values(),
        );
        if (unique.length >= 15)
          console.log(
            `Early stop: found ${unique.length} candidates at ${prefixLength}-bit`,
          );
        break;
      }
      let unique = Array.from(new Map(all.map((it) => [it.SK, it])).values());
      console.log(`LSH retrieved ${unique.length} unique candidates`);

      if (unique.length < 10) {
        console.log(
          'LSh recall too low, fetching all chunks for comprehensive search',
        );
        const allChunks = await this.client.fetchAllChunksForFile(
          fileName,
          100,
        );

        const combined = [...unique, ...allChunks];
        unique = Array.from(
          new Map(combined.map((it) => [it.SK, it])).values(),
        );
        console.log(`After fallback: ${unique.length} total candidates`);
      }
      if (unique.length === 0) {
        return "Sorry, I couldn't find relevant info in those materials.";
      }

      unique.forEach((c, i) => {
        console.log(
          `Candidate ${i}:`,
          c.textChunk.slice(0, 80).replace(/\n/g, ' ') + '...',
        );
      });

      const ranked = await this.helper.rankCandidates(qVec, unique);
      const topK = ranked.slice(0, 10);
      const context = ranked.map((c) => c.textChunk).join('\n\n---\n\n');
      console.log(`Final context contains ${topK.length} chunks.`);
      console.debug('--- FINAL CONTEXT ---');
      console.debug(context);
      console.debug('--- END OF CONTEXT ---');
      console.log(`Final context contains ${ranked.length} chunks`);

      const inputTokens = await this.gemini.countFullPrompt(question, context);
      console.log(
        `[PROACTIVE CHECK] Estimated total input tokens: ${inputTokens}`,
      );

      const completionResponse = await this.gemini.getGeminiCompletion(
        question,
        context,
      );
      answer = completionResponse.text;
      usage = completionResponse.usage;
      console.log('--- LLM INTERACTION LOG ---');
      console.log(`INPUT TO LLM (Question): ${question}`);
      console.log(`OUTPUT FROM LLM (Answer): ${answer}`);
      console.log(
        `[REACTIVE LOG] Actual Token Usage - Input: ${usage.inputTokens}, Output: ${usage.outputTokens}, Total: ${usage.totalTokens}`,
      );
      console.log('--- END OF LOG ---');
    } else {
      console.log(`Intent is general question...`);
      const completionResponse = await this.gemini.getGeminiCompletion(
        question,
        '',
      );
      answer = completionResponse.text;
      usage = completionResponse.usage;
      console.log('--- LLM INTERACTION LOG ---');
      console.log(`INTENT: ${intent}`);
      console.log(`INPUT TO LLM (Question): ${question}`);
      console.log(`OUTPUT FROM LLM (Answer): ${answer}`);
      console.log(
        `[REACTIVE LOG] Actual Token Usage - Input: ${usage.inputTokens}, Output: ${usage.outputTokens}, Total: ${usage.totalTokens}`,
      );
      console.log('--- END OF LOG ---');
    }
    return answer;
  }
}
