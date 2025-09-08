import { Module } from '@nestjs/common';
import { RagController } from './rag.controller';
import { RagService } from './rag.service';
import { DynamoModule } from 'src/dynamo/dynamo.module';
import { GeminiModule } from 'src/gemini/gemini.module';
import { RagHelperModule } from 'src/rag-helper/rag-helper.module';

@Module({
  imports: [DynamoModule, GeminiModule, RagHelperModule], // <-- Import dependencies
  controllers: [RagController],
  providers: [RagService],
})
export class RagModule {}
