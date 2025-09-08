import { Module } from '@nestjs/common';
import { RagHelperService } from './rag-helper.service';

@Module({
  providers: [RagHelperService],
  exports:[RagHelperService]
})
export class RagHelperModule {}
