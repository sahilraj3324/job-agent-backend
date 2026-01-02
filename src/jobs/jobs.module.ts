import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Job, JobSchema } from './schemas';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';
import { JDParserModule } from '../agents/jd-parser/jd-parser.module';
import { EmbeddingModule } from '../agents/embedding/embedding.module';

@Module({
    imports: [
        MongooseModule.forFeature([{ name: Job.name, schema: JobSchema }]),
        JDParserModule,
        EmbeddingModule,
    ],
    controllers: [JobsController],
    providers: [JobsService],
    exports: [MongooseModule, JobsService],
})
export class JobsModule { }
