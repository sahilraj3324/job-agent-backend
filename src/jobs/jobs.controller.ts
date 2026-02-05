import { Controller, Post, Body, Get, Param, Query, NotFoundException, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBody } from '@nestjs/swagger';
import { Job } from './schemas/job.schema';
import type { JobSource } from './schemas/job.schema';
import { JobsService } from './jobs.service';

class UploadJDDto {
    text: string;
}

@ApiTags('Jobs')
@Controller('jobs')
export class JobsController {
    constructor(
        private readonly jobsService: JobsService,
    ) { }

    @Post()
    @ApiOperation({ summary: 'Upload and parse a job description' })
    @ApiBody({ type: UploadJDDto })
    @ApiResponse({ status: 201, description: 'Job created successfully' })
    @ApiResponse({ status: 400, description: 'Text is required' })
    async uploadJD(@Body() dto: UploadJDDto): Promise<Job> {
        if (!dto || !dto.text) {
            throw new BadRequestException('Text is required');
        }
        return this.jobsService.createJob(dto.text);
    }

    @Get()
    @ApiOperation({ summary: 'Get all jobs with optional filters' })
    @ApiQuery({ name: 'role', required: false, description: 'Filter by role' })
    @ApiQuery({ name: 'location', required: false, description: 'Filter by location' })
    @ApiQuery({ name: 'source', required: false, enum: ['company_website', 'google_jobs'], description: 'Filter by source' })
    @ApiResponse({ status: 200, description: 'Returns list of jobs' })
    async getJobs(
        @Query('role') role?: string,
        @Query('location') location?: string,
        @Query('source') source?: JobSource,
    ): Promise<any[]> {
        const jobs = await this.jobsService.getJobs(role, location, source);

        return jobs.map((job) => ({
            id: job._id.toString(),
            companyName: job.companyName || 'Unknown',
            role: job.parsedJD.role,
            location: job.parsedJD.location,
            skills: job.parsedJD.skills,
            applyUrl: job.applyUrl || '#',
            source: job.source,
            postedAt: job.createdAt,
        }));
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get job by ID' })
    @ApiParam({ name: 'id', description: 'Job ID' })
    @ApiResponse({ status: 200, description: 'Returns job details' })
    @ApiResponse({ status: 404, description: 'Job not found' })
    async getJob(@Param('id') id: string): Promise<any> {
        const job = await this.jobsService.getJob(id);

        return {
            id: job._id.toString(),
            companyName: job.companyName || 'Unknown',
            role: job.parsedJD.role,
            location: job.parsedJD.location,
            skills: job.parsedJD.skills,
            minExperience: job.parsedJD.minExperience,
            maxExperience: job.parsedJD.maxExperience,
            description: job.rawJD,
            applyUrl: job.applyUrl || '#',
            source: job.source,
            postedAt: job.createdAt,
        };
    }
}
