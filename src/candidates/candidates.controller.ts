import { Controller, Post, Body, Get, Param, Query, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ParsedResume } from '../agents/resume-parser';
import { ResumeAnalysis } from '../agents/resume-analyzer';
import { CandidatesService } from './candidates.service';

// pdf-parse v1 - uses CommonJS default export
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse');

export interface UploadResumeDto {
    text: string;
}

export interface AnalyzeResumeDto {
    text: string;
}

export interface CandidateResponse {
    id: string;
    rawResume: string;
    parsedResume: ParsedResume;
    embedding: number[];
}

export interface AnalyzeAndMatchResponse {
    candidateId: string;
    parsedResume: ParsedResume;
    analysis: ResumeAnalysis;
    matchingJobs: any[];
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

    @Post('analyze')
    async analyzeResume(@Body() dto: AnalyzeResumeDto): Promise<ResumeAnalysis> {
        return this.candidatesService.analyzeResume(dto.text);
    }

    @Post('upload-pdf')
    @UseInterceptors(FileInterceptor('file'))
    async uploadPdfResume(
        @UploadedFile() file: Express.Multer.File,
        @Query('topK') topK?: string,
    ): Promise<AnalyzeAndMatchResponse> {
        if (!file) {
            throw new BadRequestException('No file uploaded');
        }

        // Check file type
        if (file.mimetype !== 'application/pdf') {
            throw new BadRequestException('Only PDF files are supported');
        }

        // Parse PDF to extract text
        let resumeText: string;
        try {
            // pdf-parse v1: simple function that takes buffer
            const pdfData = await pdfParse(file.buffer);
            resumeText = pdfData.text;
        } catch (pdfError: any) {
            console.error('PDF parsing error:', pdfError);
            throw new BadRequestException(`Failed to parse PDF: ${pdfError.message || 'Unknown error'}`);
        }

        if (!resumeText || resumeText.trim().length < 50) {
            throw new BadRequestException('Could not extract text from PDF. Please ensure the PDF contains readable text (not scanned images).');
        }

        // Create candidate (parses resume and creates embedding)
        const candidate = await this.candidatesService.createCandidate(resumeText);

        // Get resume analysis (improvement suggestions)
        const analysis = await this.candidatesService.analyzeResume(resumeText);

        // Get matching jobs
        const matchingJobs = await this.candidatesService.getMatchingJobs(
            candidate.id,
            topK ? parseInt(topK, 10) : 10,
        );

        return {
            candidateId: candidate.id,
            parsedResume: candidate.parsedResume,
            analysis,
            matchingJobs,
        };
    }

    @Post('analyze-and-match')
    async analyzeAndMatch(
        @Body() dto: AnalyzeResumeDto,
        @Query('topK') topK?: string,
    ): Promise<AnalyzeAndMatchResponse> {
        // First create the candidate (parses resume and creates embedding)
        const candidate = await this.candidatesService.createCandidate(dto.text);

        // Get resume analysis (improvement suggestions)
        const analysis = await this.candidatesService.analyzeResume(dto.text);

        // Get matching jobs
        const matchingJobs = await this.candidatesService.getMatchingJobs(
            candidate.id,
            topK ? parseInt(topK, 10) : 10,
        );

        return {
            candidateId: candidate.id,
            parsedResume: candidate.parsedResume,
            analysis,
            matchingJobs,
        };
    }

    @Get()
    async getAllCandidates(): Promise<Omit<CandidateResponse, 'embedding'>[]> {
        return this.candidatesService.getAllCandidates();
    }

    @Get(':id')
    async getCandidate(@Param('id') id: string): Promise<CandidateResponse | null> {
        return this.candidatesService.getCandidate(id) || null;
    }

    @Get(':id/match-jobs')
    async getMatchingJobs(
        @Param('id') id: string,
        @Query('topK') topK?: string,
    ): Promise<any[]> {
        return this.candidatesService.getMatchingJobs(
            id,
            topK ? parseInt(topK, 10) : 10,
        );
    }

    // These methods kept for internal use by MatchController
    getCandidatesWithEmbeddings(): { id: string; embedding: number[] }[] {
        return this.candidatesService.getCandidatesWithEmbeddings();
    }

    getCandidateById(id: string): CandidateResponse | undefined {
        return this.candidatesService.getCandidate(id);
    }
}
