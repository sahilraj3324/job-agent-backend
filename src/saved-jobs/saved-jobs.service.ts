import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { SavedJob } from './schemas/saved-job.schema';
import { Job } from '../jobs/schemas/job.schema';

@Injectable()
export class SavedJobsService {
    private readonly logger = new Logger(SavedJobsService.name);

    constructor(
        @InjectModel(SavedJob.name) private readonly savedJobModel: Model<SavedJob>,
        @InjectModel(Job.name) private readonly jobModel: Model<Job>,
    ) { }

    /**
     * Save a job for a user
     */
    async saveJob(userId: string, jobId: string, notes?: string): Promise<SavedJob> {
        // Verify job exists
        const job = await this.jobModel.findById(jobId).exec();
        if (!job) {
            throw new NotFoundException(`Job with ID ${jobId} not found`);
        }

        try {
            const savedJob = await this.savedJobModel.create({
                userId,
                jobId: new Types.ObjectId(jobId),
                notes,
            });
            this.logger.log(`User ${userId} saved job ${jobId}`);
            return savedJob;
        } catch (error: any) {
            if (error.code === 11000) {
                throw new ConflictException('Job already saved');
            }
            throw error;
        }
    }

    /**
     * Remove a saved job
     */
    async unsaveJob(userId: string, jobId: string): Promise<void> {
        const result = await this.savedJobModel.deleteOne({
            userId,
            jobId: new Types.ObjectId(jobId),
        }).exec();

        if (result.deletedCount === 0) {
            throw new NotFoundException('Saved job not found');
        }

        this.logger.log(`User ${userId} unsaved job ${jobId}`);
    }

    /**
     * Get all saved jobs for a user
     */
    async getSavedJobs(userId: string): Promise<any[]> {
        const savedJobs = await this.savedJobModel
            .find({ userId })
            .sort({ createdAt: -1 })
            .exec();

        // Populate job details
        const jobIds = savedJobs.map(s => s.jobId);
        const jobs = await this.jobModel.find({ _id: { $in: jobIds } }).exec();
        const jobMap = new Map(jobs.map(j => [j._id.toString(), j]));

        return savedJobs.map(saved => ({
            id: saved._id.toString(),
            savedAt: saved.createdAt,
            notes: saved.notes,
            job: jobMap.get(saved.jobId.toString()) || null,
        }));
    }

    /**
     * Check if a job is saved by a user
     */
    async isJobSaved(userId: string, jobId: string): Promise<boolean> {
        const saved = await this.savedJobModel.findOne({
            userId,
            jobId: new Types.ObjectId(jobId),
        }).exec();
        return !!saved;
    }

    /**
     * Update notes for a saved job
     */
    async updateNotes(userId: string, jobId: string, notes: string): Promise<SavedJob> {
        const savedJob = await this.savedJobModel.findOneAndUpdate(
            { userId, jobId: new Types.ObjectId(jobId) },
            { notes },
            { new: true },
        ).exec();

        if (!savedJob) {
            throw new NotFoundException('Saved job not found');
        }

        return savedJob;
    }

    /**
     * Get count of saved jobs for a user
     */
    async getSavedJobsCount(userId: string): Promise<number> {
        return this.savedJobModel.countDocuments({ userId }).exec();
    }
}
