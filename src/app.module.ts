import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { OpenAIModule } from './openai';
import { JDParserModule } from './agents/jd-parser';
import { ResumeParserModule } from './agents/resume-parser';
import { DatabaseModule } from './database';
import { JobsModule } from './jobs';

@Module({
  imports: [DatabaseModule, OpenAIModule, JDParserModule, ResumeParserModule, JobsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
