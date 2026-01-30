import { Module } from '@nestjs/common';
import { ResumeAnalyzerService } from './resume-analyzer.service';
import { OpenAIModule } from '../../openai';

@Module({
    imports: [OpenAIModule],
    providers: [ResumeAnalyzerService],
    exports: [ResumeAnalyzerService],
})
export class ResumeAnalyzerModule { }
