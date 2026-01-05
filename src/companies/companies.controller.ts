import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Company } from './schemas/company.schema';
import { Job } from '../jobs/schemas/job.schema';

@Controller('companies')
export class CompaniesController {
    constructor(
        @InjectModel(Company.name) private readonly companyModel: Model<Company>,
        @InjectModel(Job.name) private readonly jobModel: Model<Job>,
    ) { }

    @Get()
    async getCompanies(): Promise<any[]> {
        // Get all companies from the Companies collection with job counts
        const companies = await this.companyModel.aggregate([
            {
                $lookup: {
                    from: 'jobs',
                    let: { companyName: '$name' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $regexMatch: {
                                        input: '$companyName',
                                        regex: '$$companyName',
                                        options: 'i'
                                    }
                                }
                            }
                        }
                    ],
                    as: 'jobs'
                }
            },
            {
                $project: {
                    name: 1,
                    homepageUrl: 1,
                    careerPageUrl: 1,
                    jobCount: { $size: '$jobs' }
                }
            },
            { $sort: { jobCount: -1, name: 1 } }
        ]);

        return companies.map((c) => ({
            name: c.name || 'Unknown',
            jobCount: c.jobCount,
            homepageUrl: c.homepageUrl,
            careerPageUrl: c.careerPageUrl,
            // Generate logo from company name
            logo: `https://ui-avatars.com/api/?name=${encodeURIComponent((c.name || 'U').replace(/\s+/g, '+'))}&background=random&color=fff`,
        }));
    }

    @Get(':name/jobs')
    async getCompanyJobs(@Param('name') name: string): Promise<any[]> {
        const jobs = await this.jobModel
            .find({ companyName: { $regex: new RegExp(`^${decodeURIComponent(name)}$`, 'i') } })
            .sort({ createdAt: -1 })
            .exec();

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
}
