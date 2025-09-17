import {
  Controller,
  Post,
  UploadedFile,
  Body,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { RagService } from './rag.service';
import pdfParse = require('pdf-parse');

class AskQuestionDto {
  question: string;
  fileName: string;
}

class processBatch {
  fileName: string;
  chunks: string[];
  startChunkNumber: number;
}

@Controller('api')
export class RagController {
  private readonly logger = new Logger(RagController.name);

  constructor(private readonly ragService: RagService) {}

  @Post('process-batch')
  async uploadFile(@Body() body: processBatch) {
    // console.log(`process batch body`,JSON.stringify(body));
    
    const { fileName, chunks, startChunkNumber } = body;
if (!fileName || !Array.isArray(chunks) || chunks.length === 0 || startChunkNumber == null) {
  throw new BadRequestException('fileName, chunks and startChunkNumber are required.');
}
    await this.ragService.processAndStoreDocument(
      fileName,
      chunks,
      startChunkNumber,
    );
    return { success: true, message: `Batch processed successfully` };
  }

  @Post('ask')
  async askQuestion(@Body() body: AskQuestionDto) {
    const { question, fileName } = body;
    if (!question || !fileName) {
      throw new BadRequestException('Both question and fileName are required.');
    }
    const answer = await this.ragService.askQuestion(question, fileName);
    return { success: true, answer };
  }
}
