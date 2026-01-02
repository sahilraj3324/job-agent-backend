import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Job, JobSource } from './schemas/job.schema';
import { JDParserService } from '../agents/jd-parser';
import { EmbeddingService } from '../agents/embedding';

@Injectable()
export class JobsService {
    constructor(
        @InjectModel(Job.name) private readonly jobModel: Model<Job>,
        private readonly jdParser: JDParserService,
        private readonly embeddingService: EmbeddingService,
    ) { }

    async createJob(text: string, source: JobSource = 'company_website'): Promise<Job> {
        const parsedJD = await this.jdParser.parse(text);
        const embedding = await this.embeddingService.embedJob(parsedJD);

        const job = await this.jobModel.create({
            rawJD: text,
            parsedJD,
            embedding,
            source,
        });

        return job;
    }

    async getJobs(role?: string, location?: string, source?: JobSource): Promise<Job[]> {
        const filter: any = {};

        if (role) {
            filter['parsedJD.role'] = { $regex: role, $options: 'i' };
        }
        if (location) {
            filter['parsedJD.location'] = { $regex: location, $options: 'i' };
        }
        if (source) {
            filter.source = source;
        }

        return this.jobModel
            .find(filter)
            .sort({ createdAt: -1 })
            .limit(50)
            .exec();
    }

    async getJob(id: string): Promise<Job> {
        const job = await this.jobModel.findById(id).exec();
        if (!job) {
            throw new NotFoundException(`Job with ID ${id} not found`);
        }
        return job;
    }
}
