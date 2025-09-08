import {
  Controller,
  Post,
  UseInterceptors,
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

@Controller('api')
export class RagController {
  private readonly logger = new Logger(RagController.name);

  constructor(private readonly ragService: RagService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file uploaded.');

    const original = file.originalname;
    const fileName = original.replace(/\s+/g, '_');
    this.logger.log(`Received file: ${fileName}`);

    let text: string;
    try {
      text =
        file.mimetype === 'application/pdf'
          ? (await pdfParse(file.buffer)).text
          : file.buffer.toString('utf-8');
    } catch (err) {
      this.logger.error(`Parse error ${fileName}`, err.stack);
      throw new InternalServerErrorException('File processing failed.');
    }

    await this.ragService.processAndStoreDocument(text, fileName);
    return { success: true, message: `File "${fileName}" processed successfully.` };
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
