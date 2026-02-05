import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export interface Experience {
    company: string;
    role: string;
    startDate: string;
    endDate?: string;
    description?: string;
}

export interface Project {
    name: string;
    description?: string;
    url?: string;
    technologies?: string[];
}

@Schema({ timestamps: true })
export class User extends Document {
    @Prop({ required: true })
    fullName: string;

    @Prop()
    githubUrl: string;

    @Prop()
    linkedInUrl: string;

    @Prop()
    personalUrl: string;

    @Prop({ required: true, unique: true })
    email: string;

    @Prop({ required: true, select: false })
    password: string;

    @Prop()
    phone: string;

    @Prop({ type: [Object], default: [] })
    experience: Experience[];

    @Prop({ type: [Object], default: [] })
    projects: Project[];

    @Prop()
    createdAt: Date;

    @Prop()
    updatedAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
