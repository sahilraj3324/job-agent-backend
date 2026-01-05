import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Company, CompanySchema } from './schemas/company.schema';
import { Job, JobSchema } from '../jobs/schemas/job.schema';
import { CompaniesController } from './companies.controller';
import { CompaniesService } from './companies.service';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Company.name, schema: CompanySchema },
            { name: Job.name, schema: JobSchema },
        ]),
    ],
    controllers: [CompaniesController],
    providers: [CompaniesService],
    exports: [MongooseModule, CompaniesService],
})
export class CompaniesModule { }
