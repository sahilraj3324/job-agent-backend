import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Job } from '../jobs/schemas/job.schema';
import { Company } from '../companies/schemas/company.schema';
import { ScraperService } from './scraper.service';
import { LLMJobExtractorService, ExtractedJob } from './llm-job-extractor.service';
import { CareerPageDiscoveryService } from './career-page-discovery.service';
import { JDParserService } from '../agents/jd-parser';
import { JobNormalizationService } from './job-normalization.service';

export interface UniversalIngestedJob {
    id: string;
    title: string;
    companyName: string;
    location: string;
    applyUrl: string;
    isNew: boolean;
}

@Injectable()
export class UniversalIngestionService {
    private readonly logger = new Logger(UniversalIngestionService.name);

    constructor(
        @InjectModel(Job.name) private readonly jobModel: Model<Job>,
        @InjectModel(Company.name) private readonly companyModel: Model<Company>,
        private readonly scraperService: ScraperService,
        private readonly llmExtractor: LLMJobExtractorService,
        private readonly careerPageDiscovery: CareerPageDiscoveryService,
        private readonly jdParser: JDParserService,
        private readonly normalizationService: JobNormalizationService,
    ) { }

    /**
     * Ingest jobs from any company using universal scraping
     */
    async ingestCompany(company: Company): Promise<UniversalIngestedJob[]> {
        this.logger.log(`Starting universal ingestion for: ${company.name}`);

        // Step 1: Find career page if not known
        let careerPageUrl = company.careerPageUrl;
        if (!careerPageUrl) {
            careerPageUrl = await this.careerPageDiscovery.discoverCareerPage(company.homepageUrl);
            if (careerPageUrl) {
                company.careerPageUrl = careerPageUrl;
                await company.save();
                this.logger.log(`Discovered career page: ${careerPageUrl}`);
            } else {
                this.logger.warn(`No career page found for ${company.name}`);
                return [];
            }
        }

        // Step 2: Scrape career page
        const pageText = await this.scraperService.scrapeText(careerPageUrl);
        if (!pageText || pageText.length < 100) {
            this.logger.warn(`Failed to scrape or empty content: ${careerPageUrl}`);
            return [];
        }

        // Step 3: Extract jobs using LLM
        const extractedJobs = await this.llmExtractor.extractJobs(pageText, careerPageUrl);
        if (extractedJobs.length === 0) {
            this.logger.log(`No jobs found on ${careerPageUrl}`);
            return [];
        }

        this.logger.log(`Extracted ${extractedJobs.length} jobs from ${company.name}`);

        // Step 4: Process each job
        const results: UniversalIngestedJob[] = [];
        for (const job of extractedJobs) {
            try {
                const ingested = await this.processJob(job, company.name, careerPageUrl);
                if (ingested) {
                    results.push(ingested);
                }
            } catch (error) {
                this.logger.error(`Failed to process job: ${job.title}`, error);
            }
        }

        // Update last checked timestamp
        company.lastCheckedAt = new Date();
        await company.save();

        return results;
    }

    /**
     * Process a single extracted job
     */
    private async processJob(
        extractedJob: ExtractedJob,
        companyName: string,
        careerPageUrl: string,
    ): Promise<UniversalIngestedJob | null> {
        // Resolve apply URL
        let applyUrl = extractedJob.applyUrl;
        if (applyUrl && !applyUrl.startsWith('http')) {
            try {
                const base = new URL(careerPageUrl);
                applyUrl = new URL(applyUrl, base.origin).toString();
            } catch {
                applyUrl = careerPageUrl;
            }
        }
        if (!applyUrl) {
            applyUrl = careerPageUrl;
        }

        // Create job description for parsing
        const jobText = `
Title: ${extractedJob.title}
Company: ${companyName}
Location: ${extractedJob.location}
Description: ${extractedJob.description}
        `.trim();

        // Parse job description
        const parsedJD = await this.jdParser.parse(jobText);

        // Normalize
        const normalized = this.normalizationService.normalize(
            companyName,
            parsedJD,
            applyUrl,
            extractedJob.location,
        );

        // Check for duplicates
        const existing = await this.jobModel.findOne({ jobHash: normalized.jobHash }).exec();
        if (existing) {
            return {
                id: existing._id.toString(),
                title: normalized.role,
                companyName,
                location: normalized.location,
                applyUrl,
                isNew: false,
            };
        }

        // Create new job
        const job = await this.jobModel.create({
            rawJD: extractedJob.description,
            parsedJD: {
                ...parsedJD,
                role: normalized.role,
                skills: normalized.skills,
                location: normalized.location,
            },
            companyName,
            applyUrl,
            source: 'company_website',
            jobHash: normalized.jobHash,
        });

        return {
            id: job._id.toString(),
            title: normalized.role,
            companyName,
            location: normalized.location,
            applyUrl,
            isNew: true,
        };
    }

    /**
     * Seed companies from the predefined list
     */
    async seedCompanies(companies: { name: string; homepageUrl: string }[]): Promise<number> {
        let created = 0;
        for (const company of companies) {
            const exists = await this.companyModel.findOne({ name: company.name }).exec();
            if (!exists) {
                await this.companyModel.create({
                    name: company.name,
                    homepageUrl: company.homepageUrl,
                });
                created++;
            }
        }
        this.logger.log(`Seeded ${created} new companies`);
        return created;
    }
}
