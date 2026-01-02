import { Module } from '@nestjs/common';
import { CandidatesController } from './candidates.controller';

@Module({
    controllers: [CandidatesController],
    exports: [CandidatesController],
})
export class CandidatesModule { }
