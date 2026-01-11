import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class SavedJob extends Document {
    @Prop({ required: true, type: Types.ObjectId, ref: 'Job' })
    jobId: Types.ObjectId;

    @Prop({ required: true })
    userId: string;

    @Prop()
    notes: string;

    @Prop()
    createdAt: Date;

    @Prop()
    updatedAt: Date;
}

export const SavedJobSchema = SchemaFactory.createForClass(SavedJob);

// Compound index to ensure a user can only save a job once
SavedJobSchema.index({ jobId: 1, userId: 1 }, { unique: true });
