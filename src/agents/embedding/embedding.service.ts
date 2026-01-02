import { Injectable } from '@nestjs/common';
import { OpenAIService } from '../../openai';

@Injectable()
export class EmbeddingService {
    private readonly model = 'text-embedding-3-small';

    constructor(private readonly openaiService: OpenAIService) { }

    /**
     * Generate embedding for a single text
     */
    async embed(text: string): Promise<number[]> {
        const normalized = this.normalizeText(text);
        const response = await this.openaiService.createEmbedding(normalized, this.model);
        return response.data[0].embedding;
    }

    /**
     * Generate embeddings for multiple texts (batch)
     */
    async embedBatch(texts: string[]): Promise<number[][]> {
        const normalized = texts.map((t) => this.normalizeText(t));
        const response = await this.openaiService.createEmbedding(normalized, this.model);
        return response.data.map((d) => d.embedding);
    }

    /**
     * Generate embedding for a job description
     */
    async embedJob(parsedJD: {
        role: string;
        skills: string[];
        location?: string | null;
        employmentType?: string | null;
        minExperience?: number | null;
        maxExperience?: number | null;
    }): Promise<number[]> {
        const text = this.jobToText(parsedJD);
        return this.embed(text);
    }

    /**
     * Generate embedding for a candidate/resume
     */
    async embedCandidate(parsedResume: {
        primaryRole: string;
        skills: string[];
        totalExperienceYears?: number | null;
        summary?: string;
    }): Promise<number[]> {
        const text = this.candidateToText(parsedResume);
        return this.embed(text);
    }

    /**
     * Normalize text for consistent embeddings
     */
    private normalizeText(text: string): string {
        return text
            .toLowerCase()
            .replace(/\s+/g, ' ')
            .trim();
    }

    /**
     * Convert parsed job to embedding-friendly text
     */
    private jobToText(job: {
        role: string;
        skills: string[];
        location?: string | null;
        employmentType?: string | null;
        minExperience?: number | null;
        maxExperience?: number | null;
    }): string {
        const parts = [
            `Role: ${job.role}`,
            `Skills: ${job.skills.join(', ')}`,
        ];

        if (job.location) parts.push(`Location: ${job.location}`);
        if (job.employmentType) parts.push(`Type: ${job.employmentType}`);
        if (job.minExperience !== null && job.minExperience !== undefined) {
            const exp = job.maxExperience
                ? `${job.minExperience}-${job.maxExperience} years`
                : `${job.minExperience}+ years`;
            parts.push(`Experience: ${exp}`);
        }

        return parts.join('. ');
    }

    /**
     * Convert parsed resume to embedding-friendly text
     */
    private candidateToText(resume: {
        primaryRole: string;
        skills: string[];
        totalExperienceYears?: number | null;
        summary?: string;
    }): string {
        const parts = [
            `Role: ${resume.primaryRole}`,
            `Skills: ${resume.skills.join(', ')}`,
        ];

        if (resume.totalExperienceYears !== null && resume.totalExperienceYears !== undefined) {
            parts.push(`Experience: ${resume.totalExperienceYears} years`);
        }
        if (resume.summary) {
            parts.push(`Summary: ${resume.summary}`);
        }

        return parts.join('. ');
    }
}
