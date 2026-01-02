import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { ResumeParserService, ParsedResume } from '../agents/resume-parser';
import { EmbeddingService } from '../agents/embedding';
import { CandidatesService } from './candidates.service';

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
    constructor(
        private readonly candidatesService: CandidatesService,
    ) { }

    @Post()
    async uploadResume(@Body() dto: UploadResumeDto): Promise<CandidateResponse> {
        return this.candidatesService.createCandidate(dto.text);
    }

    @Get()
    async getAllCandidates(): Promise<Omit<CandidateResponse, 'embedding'>[]> {
        return this.candidatesService.getAllCandidates();
    }

    @Get(':id')
    async getCandidate(@Param('id') id: string): Promise<CandidateResponse | null> {
        return this.candidatesService.getCandidate(id) || null;
    }

    // This method might be removed from controller if only used internally by MatchController via Service
    // But keeping it if it's external API. However, MatchController should use Service.
    getCandidatesWithEmbeddings(): { id: string; embedding: number[] }[] {
        return this.candidatesService.getCandidatesWithEmbeddings();
    }

    getCandidateById(id: string): CandidateResponse | undefined {
        return this.candidatesService.getCandidate(id);
    }
}
