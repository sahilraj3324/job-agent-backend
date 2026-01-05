import { Module } from '@nestjs/common';
import { JDParserModule } from '../agents/jd-parser';
import { OpenAIModule } from '../openai';
import { JobsModule } from '../jobs';
import { CompaniesModule } from '../companies';
import { CareerPageDiscoveryService } from './career-page-discovery.service';
import { ATSDetectionService } from './ats-detection.service';
import { JobFetcherService } from './job-fetcher.service';
import { JobNormalizationService } from './job-normalization.service';
import { JobIngestionService } from './job-ingestion.service';
import { DiscoveryScheduler } from './discovery.scheduler';
import { ScraperService } from './scraper.service';
import { LLMJobExtractorService } from './llm-job-extractor.service';
import { UniversalIngestionService } from './universal-ingestion.service';
import { DiscoveryController } from './discovery.controller';

@Module({
    imports: [
        JobsModule,
        CompaniesModule,
        JDParserModule,
        OpenAIModule,
    ],
    controllers: [DiscoveryController],
    providers: [
        CareerPageDiscoveryService,
        ATSDetectionService,
        JobFetcherService,
        JobNormalizationService,
        JobIngestionService,
        DiscoveryScheduler,
        ScraperService,
        LLMJobExtractorService,
        UniversalIngestionService,
    ],
    exports: [
        JobIngestionService,
        CareerPageDiscoveryService,
        UniversalIngestionService,
    ],
})
export class DiscoveryModule { }
