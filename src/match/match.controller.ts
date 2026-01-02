import { Controller, Post, Body, Param } from '@nestjs/common';
import { MatchingService, MatchExplanationService } from '../agents/matching';
import { JobsController } from '../jobs/jobs.controller';
import { CandidatesController } from '../candidates/candidates.controller';

export interface MatchRequestDto {
    jobId: string;
    topK?: number;
    minScore?: number;
}

export interface MatchResultDto {
    candidateId: string;
    score: number;
    percentage: number;
    rank: number;
    explanation?: {
        strengths: string;
        missingSkills: string[];
        overallFit: string;
    };
}

@Controller('match')
export class MatchController {
    constructor(
        private readonly matchingService: MatchingService,
        private readonly matchExplanation: MatchExplanationService,
        private readonly jobsController: JobsController,
        private readonly candidatesController: CandidatesController,
    ) { }

    @Post()
    async matchCandidates(@Body() dto: MatchRequestDto): Promise<MatchResultDto[]> {
        const job = await this.jobsController.getJob(dto.jobId);
        if (!job) {
            throw new Error(`Job not found: ${dto.jobId}`);
        }

        const candidates = this.candidatesController.getCandidatesWithEmbeddings();
        if (candidates.length === 0) {
            return [];
        }

        let results = this.matchingService.matchJobToCandidates(
            job.embedding,
            candidates,
            dto.topK,
        );

        if (dto.minScore) {
            results = this.matchingService.filterByThreshold(results, dto.minScore);
        }

        return results.map((r) => ({
            candidateId: r.candidateId,
            score: r.score,
            percentage: this.matchingService.scoreToPercentage(r.score),
            rank: r.rank,
        }));
    }

    @Post(':jobId/explain/:candidateId')
    async explainMatch(
        @Param('jobId') jobId: string,
        @Param('candidateId') candidateId: string,
    ) {
        const job = await this.jobsController.getJob(jobId);
        if (!job) {
            throw new Error(`Job not found: ${jobId}`);
        }

        const candidate = this.candidatesController.getCandidateById(candidateId);
        if (!candidate) {
            throw new Error(`Candidate not found: ${candidateId}`);
        }

        const explanation = await this.matchExplanation.explain(
            job.parsedJD,
            candidate.parsedResume,
        );

        return {
            jobId,
            candidateId,
            ...explanation,
        };
    }
}
