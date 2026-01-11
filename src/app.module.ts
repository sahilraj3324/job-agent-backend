import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { OpenAIModule } from './openai';
import { JDParserModule } from './agents/jd-parser';
import { ResumeParserModule } from './agents/resume-parser';
import { EmbeddingModule } from './agents/embedding';
import { MatchingModule } from './agents/matching';
import { DatabaseModule } from './database';
import { JobsModule } from './jobs';
import { CandidatesModule } from './candidates';
import { MatchModule } from './match';
import { ScheduleModule } from '@nestjs/schedule';
import { DiscoveryModule } from './discovery';
import { SavedJobsModule } from './saved-jobs';

@Module({
  imports: [
    DatabaseModule,
    OpenAIModule,
    JDParserModule,
    ResumeParserModule,
    EmbeddingModule,
    MatchingModule,
    JobsModule,
    CandidatesModule,
    MatchModule,
    ScheduleModule.forRoot(),
    DiscoveryModule,
    SavedJobsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
