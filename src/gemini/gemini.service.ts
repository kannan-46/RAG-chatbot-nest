
import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class GeminiService {
  private readonly genai: GoogleGenerativeAI;

  constructor() {
    this.genai = new GoogleGenerativeAI(process.env.GEMINI_API!);
  }

  async getGeminiEmbedding(text: string): Promise<number[]> {
    try {
      const model = this.genai.getGenerativeModel({
        model: 'text-embedding-004',
      });
      const result = await model.embedContent(text);
      const response = result.embedding.values;
      return response;
    } catch (error) {
      console.error('Error getting Gemini embedding', error.stack);
      throw new Error('Failed to get embedding from Gemini.');
    }
  }

  async getGeminiCompletion(
    question: string,
    context: string,
  ): Promise<string> {
    try {
      const model = this.genai.getGenerativeModel({
        model: 'gemini-2.5-pro',
        systemInstruction: `You are Classory AI, a friendly, encouraging, and helpful study assistant. Your main goal is to help users understand the document they've uploaded.

**Your Instructions:**

1.  **Prioritize the Document:** Always try to answer the user's question using the **CONTEXT** provided from the document first.
2.  **Handle General Questions:** If the user asks a question that is unrelated to the CONTEXT (like a general knowledge question, a math problem, or just small talk), answer it using your own knowledge.
3.  **Be Friendly:** Always respond in a warm, conversational, and positive tone. Feel free to use emojis where appropriate to be more engaging! 😊
4.  **Clarify Your Source:** When you answer using your general knowledge, it's helpful to let the user know. For example, say "That's not in the document, but I can tell you..."
5.  **Be Honest:** If you don't know the answer from either the document or your own knowledge, it's okay to say so.`,
      })

      const prompt = `---
CONTEXT:
${context}
---
QUESTION: ${question}`;

      const result = await model.generateContent(prompt);
      const response = result.response.text();
      return response;
    } catch (error) {
      console.error('Error getting Gemini completion', error.stack);
      throw new Error('Failed to get completion from Gemini.');
    }
  }
}
