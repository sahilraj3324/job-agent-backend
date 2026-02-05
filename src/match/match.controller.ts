import { Controller, Post, Body, Param, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { MatchingService, MatchExplanationService } from '../agents/matching';
import { JobsService } from '../jobs/jobs.service';
import { CandidatesService } from '../candidates/candidates.service';

class MatchRequestDto {
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

@ApiTags('Match')
@Controller('match')
export class MatchController {
    constructor(
        private readonly matchingService: MatchingService,
        private readonly matchExplanation: MatchExplanationService,
        private readonly jobsService: JobsService,
        private readonly candidatesService: CandidatesService,
    ) { }

    @Post()
    @ApiOperation({ summary: 'Match candidates to a job' })
    @ApiBody({ type: MatchRequestDto })
    @ApiResponse({ status: 200, description: 'Returns ranked candidate matches' })
    async matchCandidates(@Body() dto: MatchRequestDto): Promise<MatchResultDto[]> {
        const job = await this.jobsService.getJob(dto.jobId);
        // job is now the Document, so it has embedding

        const candidates = this.candidatesService.getCandidatesWithEmbeddings();
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
    @ApiOperation({ summary: 'Get detailed explanation of a match' })
    @ApiParam({ name: 'jobId', description: 'Job ID' })
    @ApiParam({ name: 'candidateId', description: 'Candidate ID' })
    @ApiResponse({ status: 200, description: 'Returns match explanation' })
    @ApiResponse({ status: 404, description: 'Job or candidate not found' })
    async explainMatch(
        @Param('jobId') jobId: string,
        @Param('candidateId') candidateId: string,
    ) {
        const job = await this.jobsService.getJob(jobId);

        const candidate = this.candidatesService.getCandidate(candidateId);
        if (!candidate) {
            throw new NotFoundException(`Candidate not found: ${candidateId}`);
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
