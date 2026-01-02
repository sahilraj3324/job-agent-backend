import { Injectable } from '@nestjs/common';
import { ResumeParserService, ParsedResume } from '../agents/resume-parser';
import { EmbeddingService } from '../agents/embedding';
import { CandidateResponse } from './candidates.controller'; // Importing interface, though maybe should be DTO/Entity

@Injectable()
export class CandidatesService {
    // In-memory storage for demo
    private candidates: Map<string, CandidateResponse> = new Map();

    constructor(
        private readonly resumeParser: ResumeParserService,
        private readonly embeddingService: EmbeddingService,
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
