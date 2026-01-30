import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { ResumeParserService, ParsedResume } from '../agents/resume-parser';
import { ResumeAnalyzerService, ResumeAnalysis } from '../agents/resume-analyzer';
import { EmbeddingService } from '../agents/embedding';
import { MatchingService } from '../agents/matching';
import { JobsService } from '../jobs/jobs.service';
import { CandidateResponse } from './candidates.controller';

@Injectable()
export class CandidatesService {
    // In-memory storage for demo
    private candidates: Map<string, CandidateResponse> = new Map();

    constructor(
        private readonly resumeParser: ResumeParserService,
        private readonly resumeAnalyzer: ResumeAnalyzerService,
        private readonly embeddingService: EmbeddingService,
        private readonly matchingService: MatchingService,
        @Inject(forwardRef(() => JobsService))
        private readonly jobsService: JobsService,
    ) { }

    async createCandidate(text: string): Promise<CandidateResponse> {
        const parsedResume = await this.resumeParser.parse(text);
        const embedding = await this.embeddingService.embedCandidate(parsedResume);

        const candidate: CandidateResponse = {
            id: this.generateId(),
            rawResume: text,
            parsedResume,
            embedding,
        };

        this.candidates.set(candidate.id, candidate);
        return candidate;
    }

    async analyzeResume(text: string): Promise<ResumeAnalysis> {
        return this.resumeAnalyzer.analyze(text);
    }

    async getMatchingJobs(candidateId: string, topK: number = 10): Promise<any[]> {
        const candidate = this.candidates.get(candidateId);
        if (!candidate) {
            throw new Error(`Candidate not found: ${candidateId}`);
        }

        // Get all jobs with embeddings
        const jobs = await this.jobsService.getJobs();
        if (jobs.length === 0) {
            return [];
        }

        // Create job embeddings array for matching
        const jobEmbeddings = jobs
            .filter(job => job.embedding && job.embedding.length > 0)
            .map(job => ({
                id: job._id.toString(),
                embedding: job.embedding,
            }));

        if (jobEmbeddings.length === 0) {
            return [];
        }

        // Use matching service to find top matching jobs
        const matches = this.matchingService.matchCandidateToJobs(
            candidate.embedding,
            jobEmbeddings,
            topK,
        );

        // Map matches to full job data with scores
        return matches.map(match => {
            const job = jobs.find(j => j._id.toString() === match.jobId);
            return {
                job: job ? {
                    id: job._id.toString(),
                    companyName: job.companyName || 'Unknown Company',
                    role: job.parsedJD?.role || 'Unknown Role',
                    location: job.parsedJD?.location || 'Unknown Location',
                    skills: job.parsedJD?.skills || [],
                    applyUrl: job.applyUrl || '',
                    source: job.source,
                    postedAt: job.createdAt,
                } : null,
                score: match.score,
                percentage: this.matchingService.scoreToPercentage(match.score),
                rank: match.rank,
            };
        }).filter(m => m.job !== null);
    }

    getAllCandidates(): Omit<CandidateResponse, 'embedding'>[] {
        return Array.from(this.candidates.values()).map(({ embedding, ...rest }) => rest);
    }

    getCandidate(id: string): CandidateResponse | undefined {
        return this.candidates.get(id);
    }

    getCandidatesWithEmbeddings(): { id: string; embedding: number[] }[] {
        return Array.from(this.candidates.values()).map((c) => ({
            id: c.id,
            embedding: c.embedding,
        }));
    }

    private generateId(): string {
        return `cand_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    }
}
