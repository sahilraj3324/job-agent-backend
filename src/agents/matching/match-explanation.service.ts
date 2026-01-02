import { Injectable } from '@nestjs/common';
import { OpenAIService } from '../../openai';

export interface MatchExplanation {
    strengths: string;
    missingSkills: string[];
    overallFit: string;
}

export interface ParsedJD {
    role: string;
    minExperience: number | null;
    maxExperience: number | null;
    skills: string[];
    location: string | null;
    employmentType: string | null;
}

export interface ParsedCandidate {
    primaryRole: string;
    skills: string[];
    totalExperienceYears: number | null;
    summary: string;
}

@Injectable()
export class MatchExplanationService {
    private readonly systemPrompt = `You are a recruiting assistant that explains job-candidate matches.

CRITICAL: You MUST respond with ONLY valid JSON. No markdown, no code blocks, no explanations.

OUTPUT SCHEMA:
{
  "strengths": "string - 2-3 sentences highlighting why this candidate is a good fit",
  "missingSkills": ["array", "of", "missing", "skills"],
  "overallFit": "string - one sentence summary: 'Strong Match', 'Good Match', 'Partial Match', or 'Weak Match' with brief reason"
}

RULES:
1. STRENGTHS: Focus on overlapping skills, relevant experience, and role alignment. Be specific about matching skills.
2. MISSING SKILLS: List only skills from the JD that the candidate does NOT have. If all skills match, return empty array.
3. OVERALL FIT: Consider skill overlap percentage, experience match, and role relevance.
4. Be concise and actionable. Recruiters need quick insights.
5. If experience is slightly below requirement but skills are strong, still consider it a good match.`;

    constructor(private readonly openaiService: OpenAIService) { }

    async explain(
        parsedJD: ParsedJD,
        parsedCandidate: ParsedCandidate,
    ): Promise<MatchExplanation> {
        const userPrompt = `JOB REQUIREMENTS:
Role: ${parsedJD.role}
Required Skills: ${parsedJD.skills.join(', ')}
Experience: ${this.formatExperience(parsedJD.minExperience, parsedJD.maxExperience)}
Location: ${parsedJD.location || 'Not specified'}
Type: ${parsedJD.employmentType || 'Not specified'}

CANDIDATE PROFILE:
Role: ${parsedCandidate.primaryRole}
Skills: ${parsedCandidate.skills.join(', ')}
Experience: ${parsedCandidate.totalExperienceYears !== null ? `${parsedCandidate.totalExperienceYears} years` : 'Not specified'}
Summary: ${parsedCandidate.summary}

Analyze this match and provide strengths, missing skills, and overall fit.`;

        const response = await this.openaiService.createChatCompletion(
            [
                { role: 'system', content: this.systemPrompt },
                { role: 'user', content: userPrompt },
            ],
            'gpt-4o-mini',
            { temperature: 0.3 },
        );

        const content = response.choices[0].message.content;
        if (!content) {
            throw new Error('Empty response from OpenAI');
        }

        try {
            const jsonStr = content.replace(/```json\n?|\n?```/g, '').trim();
            return JSON.parse(jsonStr) as MatchExplanation;
        } catch {
            throw new Error(`Failed to parse JSON response: ${content}`);
        }
    }

    private formatExperience(min: number | null, max: number | null): string {
        if (min === null && max === null) return 'Not specified';
        if (max === null) return `${min}+ years`;
        if (min === null) return `Up to ${max} years`;
        return `${min}-${max} years`;
    }
}
