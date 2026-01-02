import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Job, JobSource } from '../jobs/schemas/job.schema';
import { Company, ATSType } from '../companies/schemas/company.schema';
import { JDParserService, ParsedJobDescription } from '../agents/jd-parser';
import { JobFetcherService, FetchedJob } from './job-fetcher.service';
import { ATSDetectionService } from './ats-detection.service';
import { CareerPageDiscoveryService } from './career-page-discovery.service';
import { JobNormalizationService } from './job-normalization.service';

export interface IngestedJob {
    id: string;
    title: string;
    companyName: string;
    location: string;
    applyUrl: string;
    parsedJD: ParsedJobDescription;
    source: JobSource;
    isNew: boolean;
}

@Injectable()
export class JobIngestionService {
    private readonly logger = new Logger(JobIngestionService.name);

    constructor(
        @InjectModel(Job.name) private readonly jobModel: Model<Job>,
        @InjectModel(Company.name) private readonly companyModel: Model<Company>,
        private readonly jdParser: JDParserService,
        private readonly jobFetcher: JobFetcherService,
        private readonly atsDetection: ATSDetectionService,
        private readonly careerPageDiscovery: CareerPageDiscoveryService,
        private readonly normalizationService: JobNormalizationService,
    ) { }

    /**
     * Ingest jobs for a specific company record
     * Orchestrates discovery, ATS detection, and ingestion
     */
    async ingestCompany(company: Company): Promise<IngestedJob[]> {
        this.logger.log(`Starting ingestion for company: ${company.name}`);

        let careerPageUrl = company.careerPageUrl;

        // 1. Discover career page if missing
        if (!careerPageUrl) {
            careerPageUrl = await this.careerPageDiscovery.discoverCareerPage(company.homepageUrl);
            if (careerPageUrl) {
                this.logger.log(`Discovered career page for ${company.name}: ${careerPageUrl}`);
                company.careerPageUrl = careerPageUrl;
                await company.save();
            } else {
                this.logger.warn(`Could not find career page for ${company.name}`);
                return [];
            }
        }

        // 2. Detect and update ATS type if missing or unknown
        if (!company.atsType || company.atsType === 'other') {
            const detectedAts = this.atsDetection.detect(careerPageUrl);
            if (detectedAts !== 'unknown') {
                company.atsType = detectedAts;
                await company.save();
                this.logger.log(`Updated ATS type for ${company.name} to ${detectedAts}`);
            }
        }

        // 3. Ingest jobs using the resolved info
        const jobs = await this.ingestFromCareerPage(
            company.name,
            careerPageUrl,
            company.atsType || 'other'
        );

        // 4. Update last checked timestamp
        company.lastCheckedAt = new Date();
        await company.save();

        return jobs;
    }

    /**
     * Basic ingestion from a URL (helper for the orchestration above)
     */
    async ingestFromCareerPage(
        companyName: string,
        careerPageUrl: string,
        atsType: ATSType = 'other',
    ): Promise<IngestedJob[]> {
        // If ATS type isn't provided/known, try to detect it on the fly
        if (atsType === 'other') {
            const detected = this.atsDetection.detect(careerPageUrl);
            if (detected !== 'unknown') atsType = detected;
        }

        this.logger.log(`Fetching jobs for ${companyName} (ATS: ${atsType})`);

        // Fetch raw jobs
        const fetchedJobs = await this.jobFetcher.fetchJobs(careerPageUrl, atsType);
        this.logger.log(`Fetched ${fetchedJobs.length} jobs from ${companyName}`);

        // Process each job
        const results: IngestedJob[] = [];
        for (const job of fetchedJobs) {
            try {
                const ingested = await this.processJob(job, companyName, atsType);
                if (ingested) {
                    results.push(ingested);
                }
            } catch (error) {
                this.logger.error(`Failed to process job: ${job.title}`, error);
            }
        }

        return results;
    }

    /**
     * Process a single fetched job
     */
    private async processJob(
        fetchedJob: FetchedJob,
        companyName: string,
        atsType: string,
    ): Promise<IngestedJob | null> {
        // Parse job description
        const parsedJD = await this.jdParser.parse(fetchedJob.description);

        // Normalize and generate hash
        const normalized = this.normalizationService.normalize(
            companyName,
            parsedJD,
            fetchedJob.applyUrl,
            fetchedJob.location
        );

        // Check if job already exists using normalized hash
        const existing = await this.jobModel.findOne({ jobHash: normalized.jobHash }).exec();
        if (existing) {
            return {
                id: existing._id.toString(),
                title: normalized.role,
                companyName,
                location: normalized.location,
                applyUrl: fetchedJob.applyUrl,
                parsedJD: existing.parsedJD,
                source: existing.source,
                isNew: false,
            };
        }

        // Create job record
        const job = await this.jobModel.create({
            rawJD: fetchedJob.description,
            parsedJD: {
                ...parsedJD,
                role: normalized.role,
                skills: normalized.skills,
                location: normalized.location,
            },
            companyName,
            applyUrl: fetchedJob.applyUrl,
            source: 'company_website',
            jobHash: normalized.jobHash,
        });

        return {
            id: job._id.toString(),
            title: normalized.role,
            companyName,
            location: normalized.location,
            applyUrl: fetchedJob.applyUrl,
            parsedJD: job.parsedJD,
            source: job.source,
            isNew: true,
        };
    }
}

