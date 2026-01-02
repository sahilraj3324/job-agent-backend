import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { ResumeParserService, ParsedResume } from '../agents/resume-parser';
import { EmbeddingService } from '../agents/embedding';

export interface UploadResumeDto {
    text: string;
}

export interface CandidateResponse {
    id: string;
    rawResume: string;
    parsedResume: ParsedResume;
    embedding: number[];
}

@Controller('candidates')
export class CandidatesController {
    // In-memory storage for demo (replace with actual DB in production)
    private candidates: Map<string, CandidateResponse> = new Map();

    constructor(
        private readonly resumeParser: ResumeParserService,
        private readonly embeddingService: EmbeddingService,
    ) { }

    @Post()
    async uploadResume(@Body() dto: UploadResumeDto): Promise<CandidateResponse> {
        const parsedResume = await this.resumeParser.parse(dto.text);
        const embedding = await this.embeddingService.embedCandidate(parsedResume);

        const candidate: CandidateResponse = {
            id: this.generateId(),
            rawResume: dto.text,
            parsedResume,
            embedding,
        };

        this.candidates.set(candidate.id, candidate);
        return candidate;
    }

    @Get()
    async getAllCandidates(): Promise<Omit<CandidateResponse, 'embedding'>[]> {
        return Array.from(this.candidates.values()).map(({ embedding, ...rest }) => rest);
    }

    @Get(':id')
    async getCandidate(@Param('id') id: string): Promise<CandidateResponse | null> {
        return this.candidates.get(id) || null;
    }

    // Expose candidates with embeddings for matching service
    getCandidatesWithEmbeddings(): { id: string; embedding: number[] }[] {
        return Array.from(this.candidates.values()).map((c) => ({
            id: c.id,
            embedding: c.embedding,
        }));
    }

    getCandidateById(id: string): CandidateResponse | undefined {
        return this.candidates.get(id);
    }

    private generateId(): string {
        return `cand_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    }
}
