import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Company } from './schemas/company.schema';
import { Job } from '../jobs/schemas/job.schema';

@ApiTags('Companies')
@Controller('companies')
export class CompaniesController {
    constructor(
        @InjectModel(Company.name) private readonly companyModel: Model<Company>,
        @InjectModel(Job.name) private readonly jobModel: Model<Job>,
    ) { }

    @Get()
    @ApiOperation({ summary: 'Get all companies with job counts' })
    @ApiResponse({ status: 200, description: 'Returns list of companies' })
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
    @ApiOperation({ summary: 'Get all jobs for a specific company' })
    @ApiParam({ name: 'name', description: 'Company name' })
    @ApiResponse({ status: 200, description: 'Returns jobs for the company' })
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
