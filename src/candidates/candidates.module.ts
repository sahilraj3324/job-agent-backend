import { Module, forwardRef } from '@nestjs/common';
import { CandidatesController } from './candidates.controller';
import { CandidatesService } from './candidates.service';
import { ResumeParserModule } from '../agents/resume-parser/resume-parser.module';
import { ResumeAnalyzerModule } from '../agents/resume-analyzer';
import { EmbeddingModule } from '../agents/embedding/embedding.module';
import { MatchingModule } from '../agents/matching';
import { JobsModule } from '../jobs';

@Module({
    imports: [
        ResumeParserModule,
        ResumeAnalyzerModule,
        EmbeddingModule,
        MatchingModule,
        forwardRef(() => JobsModule),
    ],
    controllers: [CandidatesController],
    providers: [CandidatesService],
    exports: [CandidatesService],
})
export class CandidatesModule { }

