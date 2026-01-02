import { Injectable } from '@nestjs/common';
import { cosineSimilarity } from '../../common/utils';

export interface CandidateMatch {
    candidateId: string;
    score: number;
    embedding: number[];
}

export interface MatchResult {
    candidateId: string;
    score: number;
    rank: number;
}

@Injectable()
export class MatchingService {
    /**
     * Match a job against multiple candidates
     * Returns ranked results sorted by similarity score (highest first)
     */
    matchJobToCandidates(
        jobEmbedding: number[],
        candidates: { id: string; embedding: number[] }[],
        topK?: number,
    ): MatchResult[] {
        const results: MatchResult[] = candidates
            .map((candidate) => ({
                candidateId: candidate.id,
                score: cosineSimilarity(jobEmbedding, candidate.embedding),
                rank: 0,
            }))
            .sort((a, b) => b.score - a.score)
            .map((result, index) => ({
                ...result,
                rank: index + 1,
            }));

        if (topK) {
            return results.slice(0, topK);
        }

        return results;
    }

    /**
     * Match a candidate against multiple jobs
     * Returns ranked results sorted by similarity score (highest first)
     */
    matchCandidateToJobs(
        candidateEmbedding: number[],
        jobs: { id: string; embedding: number[] }[],
        topK?: number,
    ): { jobId: string; score: number; rank: number }[] {
        const results = jobs
            .map((job) => ({
                jobId: job.id,
                score: cosineSimilarity(candidateEmbedding, job.embedding),
                rank: 0,
            }))
            .sort((a, b) => b.score - a.score)
            .map((result, index) => ({
                ...result,
                rank: index + 1,
            }));

        if (topK) {
            return results.slice(0, topK);
        }

        return results;
    }

    /**
     * Filter matches by minimum score threshold
     */
    filterByThreshold<T extends { score: number }>(
        matches: T[],
        minScore: number,
    ): T[] {
        return matches.filter((m) => m.score >= minScore);
    }

    /**
     * Calculate match percentage (0-100)
     */
    scoreToPercentage(score: number): number {
        // Cosine similarity ranges from -1 to 1
        // Convert to 0-100 percentage
        return Math.round(((score + 1) / 2) * 100);
    }
}
