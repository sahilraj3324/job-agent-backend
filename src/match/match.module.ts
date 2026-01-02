import { Module } from '@nestjs/common';
import { MatchController } from './match.controller';
import { JobsModule } from '../jobs/jobs.module';
import { CandidatesModule } from '../candidates/candidates.module';
import { MatchingModule } from '../agents/matching/matching.module';

@Module({
    imports: [JobsModule, CandidatesModule, MatchingModule],
    controllers: [MatchController],
})
export class MatchModule { }
