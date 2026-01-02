import { Module } from '@nestjs/common';
import { MatchingService } from './matching.service';
import { MatchExplanationService } from './match-explanation.service';

@Module({
    providers: [MatchingService, MatchExplanationService],
    exports: [MatchingService, MatchExplanationService],
})
export class MatchingModule { }
