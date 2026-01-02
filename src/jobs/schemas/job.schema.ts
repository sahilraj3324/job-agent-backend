import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export interface ParsedJD {
    role: string;
    minExperience: number | null;
    maxExperience: number | null;
    skills: string[];
    location: string | null;
    employmentType: string | null;
}

export type JobSource = 'company_website' | 'google_jobs';

@Schema({ timestamps: true })
export class Job extends Document {
    @Prop({ required: true })
    rawJD: string;

    @Prop({ type: Object, required: true })
    parsedJD: ParsedJD;

    @Prop({ type: [Number], index: '2dsphere' }) // or just array of numbers
    embedding: number[];

    @Prop()
    companyName: string;

    @Prop()
    applyUrl: string;

    @Prop({ type: String, enum: ['company_website', 'google_jobs'] })
    source: JobSource;

    @Prop({ unique: true, sparse: true })
    jobHash: string;

    @Prop()
    createdAt: Date;

    @Prop()
    updatedAt: Date;
}

export const JobSchema = SchemaFactory.createForClass(Job);
