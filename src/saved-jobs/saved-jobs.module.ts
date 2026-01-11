import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SavedJob, SavedJobSchema } from './schemas';
import { SavedJobsController } from './saved-jobs.controller';
import { SavedJobsService } from './saved-jobs.service';
import { JobsModule } from '../jobs';

@Module({
    imports: [
        MongooseModule.forFeature([{ name: SavedJob.name, schema: SavedJobSchema }]),
        JobsModule,
    ],
    controllers: [SavedJobsController],
    providers: [SavedJobsService],
    exports: [SavedJobsService],
})
export class SavedJobsModule { }
