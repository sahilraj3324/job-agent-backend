import * as dotenv from 'dotenv';
dotenv.config();
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { JobIngestionService } from '../src/discovery/job-ingestion.service';
import { getModelToken } from '@nestjs/mongoose';
import { Company } from '../src/companies/schemas/company.schema';
import { Model } from 'mongoose';

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const ingestionService = app.get(JobIngestionService);
    const companyModel = app.get<Model<Company>>(getModelToken(Company.name));

    const companies = await companyModel.find().exec();
    console.log(`Found ${companies.length} companies to ingest...`);

    for (const company of companies) {
        console.log(`Ingesting ${company.name}...`);
        try {
            await ingestionService.ingestCompany(company);
        } catch (e) {
            console.error(`Error ingesting ${company.name}:`, e);
        }
    }

    console.log('Ingestion complete!');
    await app.close();
    process.exit(0);
}

bootstrap();
