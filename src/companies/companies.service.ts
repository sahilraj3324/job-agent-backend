import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Company } from './schemas/company.schema';

@Injectable()
export class CompaniesService {
    constructor(
        @InjectModel(Company.name) private readonly companyModel: Model<Company>,
    ) { }

    async getCompanies(): Promise<Company[]> {
        return this.companyModel.find().sort({ name: 1 }).exec();
    }

    async getCompanyByName(name: string): Promise<Company | null> {
        return this.companyModel.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } }).exec();
    }
}
