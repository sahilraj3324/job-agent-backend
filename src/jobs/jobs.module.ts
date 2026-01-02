import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Job, JobSchema } from './schemas';
import { JobsController } from './jobs.controller';

@Module({
    imports: [
        MongooseModule.forFeature([{ name: Job.name, schema: JobSchema }]),
    ],
    controllers: [JobsController],
    exports: [MongooseModule, JobsController],
})
export class JobsModule { }
