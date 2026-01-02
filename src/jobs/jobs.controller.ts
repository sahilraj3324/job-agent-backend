import { Controller, Post, Body, Get, Param, Query, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JDParserService } from '../agents/jd-parser';
import { EmbeddingService } from '../agents/embedding';
import { Job } from './schemas/job.schema';
import type { JobSource } from './schemas/job.schema';
import { JobsService } from './jobs.service';

export interface UploadJDDto {
    text: string;
}

@Controller('jobs')
export class JobsController {
    constructor(
        private readonly jobsService: JobsService,
    ) { }

    @Post()
    async uploadJD(@Body() dto: UploadJDDto): Promise<Job> {
        return this.jobsService.createJob(dto.text);
    }

    @Get()
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
