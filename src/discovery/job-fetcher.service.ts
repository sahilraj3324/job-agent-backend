import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { ATSType } from './ats-detection.service';

export interface FetchedJob {
    title: string;
    location: string;
    description: string;
    applyUrl: string;
}

@Injectable()
export class JobFetcherService {
    private readonly logger = new Logger(JobFetcherService.name);

    /**
     * Fetch jobs from a career page based on ATS type
     */
    async fetchJobs(careerPageUrl: string, atsType: ATSType): Promise<FetchedJob[]> {
        switch (atsType) {
            case 'greenhouse':
                return this.fetchGreenhouseJobs(careerPageUrl);
            case 'lever':
                return this.fetchLeverJobs(careerPageUrl);
            default:
                this.logger.warn(`Unsupported ATS type: ${atsType}`);
                return [];
        }
    }

    /**
     * Fetch jobs from Greenhouse public API
     * URL pattern: https://boards.greenhouse.io/{company_name}
     * API: https://boards-api.greenhouse.io/v1/boards/{company_name}/jobs
     */
    private async fetchGreenhouseJobs(careerPageUrl: string): Promise<FetchedJob[]> {
        try {
            const companyName = this.extractGreenhouseCompany(careerPageUrl);
            if (!companyName) {
                this.logger.warn(`Could not extract Greenhouse company from: ${careerPageUrl}`);
                return [];
            }

            const apiUrl = `https://boards-api.greenhouse.io/v1/boards/${companyName}/jobs?content=true`;
            const response = await axios.get(apiUrl, { timeout: 10000 });

            const jobs = response.data.jobs || [];
            return jobs.map((job: any) => ({
                title: job.title || '',
                location: job.location?.name || 'Not specified',
                description: this.stripHtml(job.content || ''),
                applyUrl: job.absolute_url || `https://boards.greenhouse.io/${companyName}/jobs/${job.id}`,
            }));
        } catch (error) {
            this.logger.error(`Failed to fetch Greenhouse jobs: ${error}`);
            return [];
        }
    }

    /**
     * Fetch jobs from Lever public API
     * URL pattern: https://jobs.lever.co/{company_name}
     * API: https://api.lever.co/v0/postings/{company_name}
     */
    private async fetchLeverJobs(careerPageUrl: string): Promise<FetchedJob[]> {
        try {
            const companyName = this.extractLeverCompany(careerPageUrl);
            if (!companyName) {
                this.logger.warn(`Could not extract Lever company from: ${careerPageUrl}`);
                return [];
            }

            const apiUrl = `https://api.lever.co/v0/postings/${companyName}`;
            const response = await axios.get(apiUrl, { timeout: 10000 });

            const jobs = response.data || [];
            return jobs.map((job: any) => ({
                title: job.text || '',
                location: job.categories?.location || 'Not specified',
                description: this.stripHtml(job.descriptionPlain || job.description || ''),
                applyUrl: job.applyUrl || job.hostedUrl || '',
            }));
        } catch (error) {
            this.logger.error(`Failed to fetch Lever jobs: ${error}`);
            return [];
        }
    }

    /**
     * Extract company name from Greenhouse URL
     */
    private extractGreenhouseCompany(url: string): string | null {
        // Match: boards.greenhouse.io/{company} or greenhouse.io/{company}
        const match = url.match(/(?:boards\.)?greenhouse\.io\/([a-zA-Z0-9_-]+)/i);
        return match ? match[1] : null;
    }

    /**
     * Extract company name from Lever URL
     */
    private extractLeverCompany(url: string): string | null {
        // Match: jobs.lever.co/{company} or lever.co/{company}
        const match = url.match(/(?:jobs\.)?lever\.co\/([a-zA-Z0-9_-]+)/i);
        return match ? match[1] : null;
    }

    /**
     * Strip HTML tags from text
     */
    private stripHtml(html: string): string {
        return html
            .replace(/<[^>]*>/g, ' ')
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/\s+/g, ' ')
            .trim();
    }
}
