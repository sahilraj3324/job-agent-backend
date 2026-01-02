import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ATSType = 'lever' | 'greenhouse' | 'workday' | 'ashby' | 'bamboohr' | 'smartrecruiters' | 'other' | 'unknown';

@Schema({ timestamps: true })
export class Company extends Document {
    @Prop({ required: true })
    name: string;

    @Prop({ required: true })
    homepageUrl: string;

    @Prop({ type: String, default: null })
    careerPageUrl: string | null;

    @Prop({ type: String, enum: ['lever', 'greenhouse', 'workday', 'ashby', 'bamboohr', 'smartrecruiters', 'other', 'unknown'], default: null })
    atsType: ATSType | null;

    @Prop({ type: Date, default: null })
    lastCheckedAt: Date | null;

    @Prop()
    createdAt: Date;

    @Prop()
    updatedAt: Date;
}

export const CompanySchema = SchemaFactory.createForClass(Company);
