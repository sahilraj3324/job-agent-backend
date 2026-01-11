import { Controller, Post, Delete, Get, Patch, Body, Param, Query } from '@nestjs/common';
import { SavedJobsService } from './saved-jobs.service';

@Controller('saved-jobs')
export class SavedJobsController {
    constructor(private readonly savedJobsService: SavedJobsService) { }

    /**
     * Save a job
     * POST /saved-jobs
     */
    @Post()
    async saveJob(
        @Body() body: { userId: string; jobId: string; notes?: string },
    ) {
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

    /**
     * Unsave a job
     * DELETE /saved-jobs/:jobId?userId=xxx
     */
    @Delete(':jobId')
    async unsaveJob(
        @Param('jobId') jobId: string,
        @Query('userId') userId: string,
    ) {
        await this.savedJobsService.unsaveJob(userId, jobId);
        return { message: 'Job unsaved successfully' };
    }

    /**
     * Get all saved jobs for a user
     * GET /saved-jobs?userId=xxx
     */
    @Get()
    async getSavedJobs(@Query('userId') userId: string) {
        const savedJobs = await this.savedJobsService.getSavedJobs(userId);
        return {
            count: savedJobs.length,
            savedJobs,
        };
    }

    /**
     * Check if a job is saved
     * GET /saved-jobs/check/:jobId?userId=xxx
     */
    @Get('check/:jobId')
    async isJobSaved(
        @Param('jobId') jobId: string,
        @Query('userId') userId: string,
    ) {
        const isSaved = await this.savedJobsService.isJobSaved(userId, jobId);
        return { isSaved };
    }

    /**
     * Update notes for a saved job
     * PATCH /saved-jobs/:jobId
     */
    @Patch(':jobId')
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
