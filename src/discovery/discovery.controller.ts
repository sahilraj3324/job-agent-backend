import { Controller, Post, Get, Body, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Company } from '../companies/schemas/company.schema';
import { UniversalIngestionService } from './universal-ingestion.service';
import { seedCompanies } from './seed-companies';

@Controller('discovery')
export class DiscoveryController {
    private readonly logger = new Logger(DiscoveryController.name);

    constructor(
        @InjectModel(Company.name) private readonly companyModel: Model<Company>,
        private readonly universalIngestion: UniversalIngestionService,
    ) { }

    /**
     * Seed companies from the predefined list
     */
    @Post('seed')
    async seedCompaniesEndpoint() {
        const count = await this.universalIngestion.seedCompanies(seedCompanies);
        return { message: `Seeded ${count} new companies`, total: seedCompanies.length };
    }

    /**
     * Trigger job discovery for a specific company
     */
    @Post('ingest')
    async ingestCompany(@Body() body: { companyName?: string; homepageUrl?: string }) {
        let company: Company | null = null;

        if (body.companyName) {
            company = await this.companyModel.findOne({
                name: { $regex: new RegExp(`^${body.companyName}$`, 'i') }
            }).exec();
        }

        if (!company && body.homepageUrl) {
            // Create new company
            company = await this.companyModel.create({
                name: body.companyName || new URL(body.homepageUrl).hostname.replace('www.', ''),
                homepageUrl: body.homepageUrl,
            });
        }

        if (!company) {
            return { error: 'Company not found. Provide companyName or homepageUrl.' };
        }

        const jobs = await this.universalIngestion.ingestCompany(company);
        return {
            company: company.name,
            careerPage: company.careerPageUrl,
            jobsFound: jobs.length,
            newJobs: jobs.filter(j => j.isNew).length,
            jobs: jobs.slice(0, 10), // Return first 10
        };
    }

    /**
     * Trigger discovery for all companies (batch)
     */
    @Post('ingest-all')
    async ingestAll(@Body() body: { limit?: number }) {
        const limit = body.limit || 10;
        const companies = await this.companyModel
            .find()
            .sort({ lastCheckedAt: 1 }) // Oldest first
            .limit(limit)
            .exec();

        const results: { company: string; jobsFound?: number; newJobs?: number; error?: string }[] = [];
        for (const company of companies) {
            try {
                const jobs = await this.universalIngestion.ingestCompany(company);
                results.push({
                    company: company.name,
                    jobsFound: jobs.length,
                    newJobs: jobs.filter(j => j.isNew).length,
                });
                // Be polite - wait between requests
                await new Promise(resolve => setTimeout(resolve, 2000));
            } catch (error) {
                this.logger.error(`Failed: ${company.name}`, error);
                results.push({ company: company.name, error: String(error) });
            }
        }

        return { processed: results.length, results };
    }

    /**
     * Get discovery status
     */
    @Get('status')
    async getStatus() {
        const totalCompanies = await this.companyModel.countDocuments();
        const companiesWithCareerPage = await this.companyModel.countDocuments({ careerPageUrl: { $ne: null } });
        const companiesCheckedToday = await this.companyModel.countDocuments({
            lastCheckedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        });

        return {
            totalCompanies,
            companiesWithCareerPage,
            companiesCheckedToday,
            pendingCompanies: totalCompanies - companiesCheckedToday,
        };
    }
}
