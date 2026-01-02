import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { JDParserModule } from '../agents/jd-parser';
import { JobsModule } from '../jobs';
import { CompaniesModule } from '../companies';
import { CareerPageDiscoveryService } from './career-page-discovery.service';
import { ATSDetectionService } from './ats-detection.service';
import { JobFetcherService } from './job-fetcher.service';
import { JobNormalizationService } from './job-normalization.service';
import { JobIngestionService } from './job-ingestion.service';
import { DiscoveryScheduler } from './discovery.scheduler';

@Module({
    imports: [
        MongooseModule.forFeature([]), // DiscoveryScheduler uses injected models, but they are from imported modules. 
        // Wait, DiscoveryScheduler uses CompanyModel which is in CompaniesModule.
        // It also uses JobIngestionService which is provided here.
        // Modules are already imported.
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
        DiscoveryScheduler,
    ],
    exports: [
        JobIngestionService,
        CareerPageDiscoveryService,
    ],
})
export class DiscoveryModule { }
