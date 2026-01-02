import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JDParserModule } from '../agents/jd-parser';
import { JobsModule } from '../jobs';
import { CompaniesModule } from '../companies';
import { CareerPageDiscoveryService } from './career-page-discovery.service';
import { ATSDetectionService } from './ats-detection.service';
import { JobFetcherService } from './job-fetcher.service';
import { JobNormalizationService } from './job-normalization.service';
import { JobIngestionService } from './job-ingestion.service';

@Module({
    imports: [
        JobsModule,
        CompaniesModule,
        JDParserModule,
    ],
    providers: [
        CareerPageDiscoveryService,
        ATSDetectionService,
        JobFetcherService,
        JobNormalizationService,
        JobIngestionService,
    ],
    exports: [
        JobIngestionService,
        CareerPageDiscoveryService,
    ],
})
export class DiscoveryModule { }
