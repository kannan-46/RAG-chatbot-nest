import { Test, TestingModule } from '@nestjs/testing';
import { RagHelperService } from './rag-helper.service';

describe('RagHelperService', () => {
  let service: RagHelperService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RagHelperService],
    }).compile();

    service = module.get<RagHelperService>(RagHelperService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
