import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Company } from '../companies/schemas/company.schema';
import { Job } from '../jobs/schemas/job.schema';
import { JobIngestionService } from './job-ingestion.service';

@Injectable()
export class DiscoveryScheduler {
    private readonly logger = new Logger(DiscoveryScheduler.name);
    private isRunning = false;
    private isCleanupRunning = false;

    constructor(
        @InjectModel(Company.name) private readonly companyModel: Model<Company>,
        @InjectModel(Job.name) private readonly jobModel: Model<Job>,
        private readonly ingestionService: JobIngestionService,
    ) { }

    /**
     * Run cleanup every day at midnight
     * - Deletes jobs older than 7 days
     * - Deletes companies with 0 jobs
     */
    @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
    async handleCleanup() {
        if (this.isCleanupRunning) {
            this.logger.warn('Cleanup job is already running, skipping this iteration');
            return;
        }

        this.isCleanupRunning = true;
        this.logger.log('Starting scheduled cleanup');

        try {
            // Step 1: Delete jobs older than 7 days
            const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            const deletedJobs = await this.jobModel.deleteMany({
                createdAt: { $lt: sevenDaysAgo },
            }).exec();
            this.logger.log(`Deleted ${deletedJobs.deletedCount} jobs older than 7 days`);

            // Step 2: Find and delete companies with 0 jobs
            const companies = await this.companyModel.find().exec();
            let deletedCompanies = 0;

            for (const company of companies) {
                const jobCount = await this.jobModel.countDocuments({
                    companyName: company.name,
                }).exec();

                if (jobCount === 0) {
                    await this.companyModel.deleteOne({ _id: company._id }).exec();
                    deletedCompanies++;
                    this.logger.log(`Deleted company with 0 jobs: ${company.name}`);
                }
            }

            this.logger.log(`Cleanup completed: ${deletedJobs.deletedCount} jobs, ${deletedCompanies} companies deleted`);

        } catch (error) {
            this.logger.error('Error in cleanup scheduler', error);
        } finally {
            this.isCleanupRunning = false;
        }
    }

    /**
     * Run job discovery every 6 hours
     * Checks companies that haven't been updated in the last 24 hours
     * Only counts companies with jobs found towards the 10-company limit
     */
    @Cron(CronExpression.EVERY_6_HOURS)
    async handleCron() {
        if (this.isRunning) {
            this.logger.warn('Discovery job is already running, skipping this iteration');
            return;
        }

        this.isRunning = true;
        this.logger.log('Starting scheduled job discovery');

        try {
            const hoursAgo = 24;
            const cutoff = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);

            // Fetch more companies than needed since some may have 0 jobs
            const companies = await this.companyModel.find({
                $or: [
                    { lastCheckedAt: { $lt: cutoff } },
                    { lastCheckedAt: null },
                ],
            }).limit(50).exec();

            if (companies.length === 0) {
                this.logger.log('No pending companies to check');
                return;
            }

            this.logger.log(`Found ${companies.length} candidate companies to check`);

            let successfulIngestions = 0;
            const maxSuccessfulIngestions = 10;

            for (const company of companies) {
                if (successfulIngestions >= maxSuccessfulIngestions) {
                    this.logger.log(`Reached ${maxSuccessfulIngestions} successful ingestions, stopping`);
                    break;
                }

                try {
                    const jobs = await this.ingestionService.ingestCompany(company);

                    // Only count companies that returned at least 1 job
                    if (jobs.length > 0) {
                        successfulIngestions++;
                        this.logger.log(`[${successfulIngestions}/${maxSuccessfulIngestions}] ${company.name}: ${jobs.length} jobs found`);
                    } else {
                        this.logger.log(`${company.name}: 0 jobs found (not counted towards limit)`);
                    }

                    // Add small delay to be polite
                    await new Promise(resolve => setTimeout(resolve, 2000));
                } catch (error) {
                    this.logger.error(`Failed to ingest company ${company.name}`, error);
                }
            }

            this.logger.log(`Completed with ${successfulIngestions} successful ingestions`);

        } catch (error) {
            this.logger.error('Error in discovery scheduler', error);
        } finally {
            this.isRunning = false;
            this.logger.log('Scheduled job discovery completed');
        }
    }
}
