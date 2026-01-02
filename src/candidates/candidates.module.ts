import { Module } from '@nestjs/common';
import { CandidatesController } from './candidates.controller';
import { CandidatesService } from './candidates.service';
import { ResumeParserModule } from '../agents/resume-parser/resume-parser.module';
import { EmbeddingModule } from '../agents/embedding/embedding.module';

@Module({
    imports: [ResumeParserModule, EmbeddingModule],
    controllers: [CandidatesController],
    providers: [CandidatesService],
    exports: [CandidatesService],
})
export class CandidatesModule { }
