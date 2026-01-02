import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Company } from '../companies/schemas/company.schema';
import { JobIngestionService } from './job-ingestion.service';

@Injectable()
export class DiscoveryScheduler {
    private readonly logger = new Logger(DiscoveryScheduler.name);
    private isRunning = false;

    constructor(
        @InjectModel(Company.name) private readonly companyModel: Model<Company>,
        private readonly ingestionService: JobIngestionService,
    ) { }

    /**
     * Run job discovery every 6 hours
     * Checks companies that haven't been updated in the last 24 hours
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

            // Find companies not checked recently
            const companies = await this.companyModel.find({
                $or: [
                    { lastCheckedAt: { $lt: cutoff } },
                    { lastCheckedAt: null },
                ],
            }).limit(10).exec(); // Process in batches of 10

            if (companies.length === 0) {
                this.logger.log('No pending companies to check');
                return;
            }

            this.logger.log(`Found ${companies.length} companies to check`);

            for (const company of companies) {
                try {
                    await this.ingestionService.ingestCompany(company);
                    // Add small delay to be polite
                    await new Promise(resolve => setTimeout(resolve, 2000));
                } catch (error) {
                    this.logger.error(`Failed to digest company ${company.name}`, error);
                }
            }

        } catch (error) {
            this.logger.error('Error in discovery scheduler', error);
        } finally {
            this.isRunning = false;
            this.logger.log('Scheduled job discovery completed');
        }
    }
}
