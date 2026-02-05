import { Controller, Post, Delete, Get, Patch, Body, Param, Query, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBody } from '@nestjs/swagger';
import { SavedJobsService } from './saved-jobs.service';

class SaveJobDto {
    userId: string;
    jobId: string;
    notes?: string;
}

class UpdateNotesDto {
    userId: string;
    notes: string;
}

@ApiTags('Saved Jobs')
@Controller('saved-jobs')
export class SavedJobsController {
    constructor(private readonly savedJobsService: SavedJobsService) { }

    @Post()
    @ApiOperation({ summary: 'Save a job for a user' })
    @ApiBody({ type: SaveJobDto })
    @ApiResponse({ status: 201, description: 'Job saved successfully' })
    @ApiResponse({ status: 400, description: 'Invalid request' })
    async saveJob(
        @Body() body: { userId: string; jobId: string; notes?: string },
    ) {
        if (!body || !body.userId || !body.jobId) {
            throw new BadRequestException('userId and jobId are required');
        }
        const saved = await this.savedJobsService.saveJob(
            body.userId,
            body.jobId,
            body.notes,
        );
        return {
            message: 'Job saved successfully',
            savedJobId: saved._id.toString(),
        };
    }

    @Delete(':jobId')
    @ApiOperation({ summary: 'Unsave a job for a user' })
    @ApiParam({ name: 'jobId', description: 'Job ID to unsave' })
    @ApiQuery({ name: 'userId', required: true, description: 'User ID' })
    @ApiResponse({ status: 200, description: 'Job unsaved successfully' })
    async unsaveJob(
        @Param('jobId') jobId: string,
        @Query('userId') userId: string,
    ) {
        await this.savedJobsService.unsaveJob(userId, jobId);
        return { message: 'Job unsaved successfully' };
    }

    @Get()
    @ApiOperation({ summary: 'Get all saved jobs for a user' })
    @ApiQuery({ name: 'userId', required: true, description: 'User ID' })
    @ApiResponse({ status: 200, description: 'Returns list of saved jobs' })
    async getSavedJobs(@Query('userId') userId: string) {
        const savedJobs = await this.savedJobsService.getSavedJobs(userId);
        return {
            count: savedJobs.length,
            savedJobs,
        };
    }

    @Get('check/:jobId')
    @ApiOperation({ summary: 'Check if a job is saved by a user' })
    @ApiParam({ name: 'jobId', description: 'Job ID' })
    @ApiQuery({ name: 'userId', required: true, description: 'User ID' })
    @ApiResponse({ status: 200, description: 'Returns save status' })
    async isJobSaved(
        @Param('jobId') jobId: string,
        @Query('userId') userId: string,
    ) {
        const isSaved = await this.savedJobsService.isJobSaved(userId, jobId);
        return { isSaved };
    }

    @Patch(':jobId')
    @ApiOperation({ summary: 'Update notes for a saved job' })
    @ApiParam({ name: 'jobId', description: 'Job ID' })
    @ApiBody({ type: UpdateNotesDto })
    @ApiResponse({ status: 200, description: 'Notes updated successfully' })
    async updateNotes(
        @Param('jobId') jobId: string,
        @Body() body: { userId: string; notes: string },
    ) {
        const updated = await this.savedJobsService.updateNotes(
            body.userId,
            jobId,
            body.notes,
        );
        return {
            message: 'Notes updated successfully',
            savedJob: updated,
        };
    }
}
