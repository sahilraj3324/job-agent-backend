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

@Schema({ timestamps: true })
export class Job extends Document {
    @Prop({ required: true })
    rawJD: string;

    @Prop({ type: Object, required: true })
    parsedJD: ParsedJD;

    @Prop()
    createdAt: Date;

    @Prop()
    updatedAt: Date;
}

export const JobSchema = SchemaFactory.createForClass(Job);
