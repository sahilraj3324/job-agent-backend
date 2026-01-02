import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { JDParserService, ParsedJobDescription } from '../agents/jd-parser';
import { EmbeddingService } from '../agents/embedding';

export interface UploadJDDto {
    text: string;
}

export interface JobResponse {
    id: string;
    rawJD: string;
    parsedJD: ParsedJobDescription;
    embedding: number[];
}

@Controller('jobs')
export class JobsController {
    // In-memory storage for demo (replace with actual DB in production)
    private jobs: Map<string, JobResponse> = new Map();

    constructor(
        private readonly jdParser: JDParserService,
        private readonly embeddingService: EmbeddingService,
    ) { }

    @Post()
    async uploadJD(@Body() dto: UploadJDDto): Promise<JobResponse> {
        const parsedJD = await this.jdParser.parse(dto.text);
        const embedding = await this.embeddingService.embedJob(parsedJD);

        const job: JobResponse = {
            id: this.generateId(),
            rawJD: dto.text,
            parsedJD,
            embedding,
        };

        this.jobs.set(job.id, job);
        return job;
    }

    @Get()
    async getAllJobs(): Promise<Omit<JobResponse, 'embedding'>[]> {
        return Array.from(this.jobs.values()).map(({ embedding, ...rest }) => rest);
    }

    @Get(':id')
    async getJob(@Param('id') id: string): Promise<JobResponse | null> {
        return this.jobs.get(id) || null;
    }

    private generateId(): string {
        return `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    }
}
