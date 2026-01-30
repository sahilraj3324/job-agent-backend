import { Injectable } from '@nestjs/common';
import { OpenAIService } from '../../openai';

export interface ResumeAnalysis {
    score: number;
    strengths: string[];
    improvements: string[];
    missingElements: string[];
    atsTips: string[];
    summary: string;
}

@Injectable()
export class ResumeAnalyzerService {
    private readonly systemPrompt = `You are an expert resume coach and career advisor. Analyze the provided resume and give actionable feedback.

CRITICAL: You MUST respond with ONLY valid JSON. No markdown, no code blocks, no explanations, no text before or after the JSON.

OUTPUT SCHEMA:
{
  "score": number (1-100),
  "strengths": ["string"],
  "improvements": ["string"],
  "missingElements": ["string"],
  "atsTips": ["string"],
  "summary": "string"
}

RULES:

1. SCORE (1-100):
   - 90-100: Exceptional resume, ready for top-tier positions
   - 75-89: Strong resume with minor improvements needed
   - 60-74: Good base but needs significant enhancements
   - 40-59: Needs substantial work on multiple areas
   - Below 40: Major restructuring required

2. STRENGTHS (3-5 items):
   - Identify what the resume does well
   - Highlight effective formatting, strong achievements, good structure
   - Be specific with examples from the resume

3. IMPROVEMENTS (3-6 items):
   - Actionable suggestions to enhance the resume
   - Be specific: don't just say "add more details" - say exactly what to add
   - Focus on impact: quantify achievements, use action verbs
   - Address formatting, content, and structure

4. MISSING ELEMENTS (2-4 items):
   - Critical sections or information that should be added
   - Skills that are implied but not explicitly listed
   - Industry-standard elements that are absent

5. ATS TIPS (2-4 items):
   - Applicant Tracking System optimization suggestions
   - Keyword recommendations
   - Formatting tips for ATS compatibility
   - Common ATS pitfalls to avoid

6. SUMMARY (2-3 sentences):
   - Overall assessment of the resume
   - Primary focus area for improvement
   - Encouraging but honest tone`;

    constructor(private readonly openaiService: OpenAIService) { }

    async analyze(resumeText: string): Promise<ResumeAnalysis> {
        const response = await this.openaiService.createChatCompletion(
            [
                { role: 'system', content: this.systemPrompt },
                { role: 'user', content: `Analyze this resume:\n\n${resumeText}` },
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
            return JSON.parse(jsonStr) as ResumeAnalysis;
        } catch {
            throw new Error(`Failed to parse JSON response: ${content}`);
        }
    }
}
