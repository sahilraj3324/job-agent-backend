import { Controller, Post, Get, Body, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Company } from '../companies/schemas/company.schema';
import { Job } from '../jobs/schemas/job.schema';
import { UniversalIngestionService } from './universal-ingestion.service';
import { CompanyDiscoveryAgent } from './company-discovery.agent';
import { seedCompanies } from './seed-companies';

@Controller('discovery')
export class DiscoveryController {
    private readonly logger = new Logger(DiscoveryController.name);

    constructor(
        @InjectModel(Company.name) private readonly companyModel: Model<Company>,
        @InjectModel(Job.name) private readonly jobModel: Model<Job>,
        private readonly universalIngestion: UniversalIngestionService,
        private readonly companyDiscoveryAgent: CompanyDiscoveryAgent,
    ) { }

    /**
     * Seed companies from the predefined list (fallback)
     */
    @Post('seed')
    async seedCompaniesEndpoint() {
        const count = await this.universalIngestion.seedCompanies(seedCompanies);
        return { message: `Seeded ${count} new companies`, total: seedCompanies.length };
    }

    /**
     * Discover companies using AI agent (from YC, LLM queries, etc.)
     */
    @Post('discover-companies')
    async discoverCompaniesEndpoint(@Body() body: { query?: string; count?: number }) {
        const count = body.count || 30;
        const logs: Array<{
            step: string;
            message: string;
            timestamp: string;
        }> = [];

        const addLog = (step: string, message: string) => {
            logs.push({ step, message, timestamp: new Date().toISOString() });
            this.logger.log(`[${step}] ${message}`);
        };

        addLog('start', 'Starting company discovery');

        let allDiscovered: any[] = [];

        // Step 1: Fetch from YC Algolia
        addLog('yc', 'Fetching companies from Y Combinator directory...');
        const ycCompanies = await this.companyDiscoveryAgent.discoverCompanies(count);
        allDiscovered.push(...ycCompanies);
        addLog('yc', `Found ${ycCompanies.length} companies (${ycCompanies.filter(c => c.isNew).length} new)`);

        // Step 2: If query provided, also use LLM to discover
        if (body.query) {
            addLog('llm', `Searching for companies matching: "${body.query}"`);
            const llmCompanies = await this.companyDiscoveryAgent.discoverFromQuery(body.query);
            allDiscovered.push(...llmCompanies);
            addLog('llm', `Found ${llmCompanies.length} companies from LLM search`);
        }

        // Step 3: Save all discovered companies
        addLog('save', 'Saving new companies to database...');
        const saved = await this.companyDiscoveryAgent.saveDiscoveredCompanies(allDiscovered);
        addLog('save', `Saved ${saved} new companies`);

        // Get total count
        const totalCompanies = await this.companyModel.countDocuments();

        return {
            summary: {
                discovered: allDiscovered.length,
                newCompanies: saved,
                totalInDatabase: totalCompanies,
            },
            companies: allDiscovered.slice(0, 50).map(c => ({
                name: c.name,
                homepageUrl: c.homepageUrl,
                industry: c.industry,
                isNew: c.isNew,
            })),
            logs,
        };
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
     * Run discovery until we find 10 companies with jobs
     * Returns detailed logs for each company processed
     */
    @Post('run')
    async runDiscovery(@Body() body: { targetSuccessful?: number }) {
        const targetSuccessful = body.targetSuccessful || 10;

        // First, seed companies if needed
        const existingCount = await this.companyModel.countDocuments();
        if (existingCount === 0) {
            await this.universalIngestion.seedCompanies(seedCompanies);
        }

        // Fetch all companies, prioritizing unchecked ones
        const companies = await this.companyModel
            .find()
            .sort({ lastCheckedAt: 1 }) // Oldest/null first
            .limit(100) // Process up to 100 to find 10 successful
            .exec();

        const logs: Array<{
            company: string;
            status: 'success' | 'no_jobs' | 'no_career_page' | 'error';
            message: string;
            jobsFound: number;
            newJobs: number;
            careerPage?: string;
            timestamp: string;
        }> = [];

        let successfulCount = 0;
        let processedCount = 0;

        for (const company of companies) {
            if (successfulCount >= targetSuccessful) {
                break;
            }

            processedCount++;
            const timestamp = new Date().toISOString();

            try {
                this.logger.log(`[${processedCount}] Processing: ${company.name}`);

                const jobs = await this.universalIngestion.ingestCompany(company);

                if (jobs.length > 0) {
                    successfulCount++;
                    logs.push({
                        company: company.name,
                        status: 'success',
                        message: `Found ${jobs.length} jobs (${jobs.filter(j => j.isNew).length} new)`,
                        jobsFound: jobs.length,
                        newJobs: jobs.filter(j => j.isNew).length,
                        careerPage: company.careerPageUrl || undefined,
                        timestamp,
                    });
                    this.logger.log(`[${successfulCount}/${targetSuccessful}] ✓ ${company.name}: ${jobs.length} jobs`);
                } else {
                    logs.push({
                        company: company.name,
                        status: company.careerPageUrl ? 'no_jobs' : 'no_career_page',
                        message: company.careerPageUrl ? 'No jobs found on career page' : 'Could not find career page',
                        jobsFound: 0,
                        newJobs: 0,
                        careerPage: company.careerPageUrl || undefined,
                        timestamp,
                    });
                    this.logger.log(`[Skip] ${company.name}: No jobs found`);
                }

                // Be polite - wait between requests
                await new Promise(resolve => setTimeout(resolve, 1500));
            } catch (error) {
                logs.push({
                    company: company.name,
                    status: 'error',
                    message: String(error).slice(0, 100),
                    jobsFound: 0,
                    newJobs: 0,
                    timestamp,
                });
                this.logger.error(`[Error] ${company.name}: ${error}`);
            }
        }

        const totalJobs = logs.reduce((sum, l) => sum + l.jobsFound, 0);
        const totalNewJobs = logs.reduce((sum, l) => sum + l.newJobs, 0);

        return {
            summary: {
                targetSuccessful,
                actualSuccessful: successfulCount,
                totalProcessed: processedCount,
                totalJobs,
                totalNewJobs,
                completed: successfulCount >= targetSuccessful,
            },
            logs,
        };
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

    /**
     * Cleanup: Delete companies with 0 jobs and old jobs
     */
    @Post('cleanup')
    async cleanup() {
        this.logger.log('Starting manual cleanup');

        // Step 1: Delete jobs older than 7 days
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const deletedJobs = await this.jobModel.deleteMany({
            createdAt: { $lt: sevenDaysAgo },
        }).exec();

        // Step 2: Find and delete companies with 0 jobs
        const companies = await this.companyModel.find().exec();
        let deletedCompanies = 0;
        const deletedCompanyNames: string[] = [];

        for (const company of companies) {
            const jobCount = await this.jobModel.countDocuments({
                companyName: company.name,
            }).exec();

            if (jobCount === 0) {
                await this.companyModel.deleteOne({ _id: company._id }).exec();
                deletedCompanies++;
                deletedCompanyNames.push(company.name);
            }
        }

        this.logger.log(`Cleanup completed: ${deletedJobs.deletedCount} jobs, ${deletedCompanies} companies deleted`);

        return {
            message: 'Cleanup completed',
            deletedJobs: deletedJobs.deletedCount,
            deletedCompanies,
            deletedCompanyNames: deletedCompanyNames.slice(0, 20), // Return first 20
        };
    }
}
