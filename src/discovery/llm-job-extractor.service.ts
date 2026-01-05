import { Injectable, Logger } from '@nestjs/common';
import { OpenAIService } from '../openai';

export interface ExtractedJob {
    title: string;
    location: string;
    description: string;
    applyUrl: string;
}

@Injectable()
export class LLMJobExtractorService {
    private readonly logger = new Logger(LLMJobExtractorService.name);

    private readonly systemPrompt = `You are a job listing extractor. Given the text content of a company's career page, extract all job postings.

CRITICAL: You MUST respond with ONLY valid JSON. No markdown, no code blocks, no explanations.

OUTPUT SCHEMA:
{
  "jobs": [
    {
      "title": "Job Title",
      "location": "City, Country or Remote",
      "description": "Brief job description (max 200 chars)",
      "applyUrl": "URL to apply or empty string if not found"
    }
  ]
}

RULES:
1. Extract ALL job listings visible on the page
2. If location is not specified, use "Not specified"
3. Keep description brief - just the key requirements or summary
4. If applyUrl is relative, leave as-is (we'll resolve it later)
5. If no jobs are found, return {"jobs": []}
6. Maximum 50 jobs per page
7. Normalize job titles (e.g., "Sr. SDE" → "Senior Software Engineer")`;

    constructor(private readonly openaiService: OpenAIService) { }

    /**
     * Extract jobs from career page text content
     */
    async extractJobs(pageText: string, pageUrl: string): Promise<ExtractedJob[]> {
        try {
            // Truncate if too long (token limit)
            const truncatedText = pageText.slice(0, 15000);

            const response = await this.openaiService.createChatCompletion(
                [
                    { role: 'system', content: this.systemPrompt },
                    { role: 'user', content: `Career page URL: ${pageUrl}\n\nPage content:\n${truncatedText}` },
                ],
                'gpt-4o-mini',
                { temperature: 0 },
            );

            const content = response.choices[0].message.content;
            if (!content) {
                this.logger.warn('Empty response from OpenAI');
                return [];
            }

            // Parse JSON response
            const jsonStr = content.replace(/```json\n?|\n?```/g, '').trim();
            const parsed = JSON.parse(jsonStr);

            const jobs: ExtractedJob[] = parsed.jobs || [];
            this.logger.log(`Extracted ${jobs.length} jobs from ${pageUrl}`);

            return jobs;
        } catch (error) {
            this.logger.error(`Failed to extract jobs: ${error}`);
            return [];
        }
    }

    /**
     * Extract job details from a single job page
     */
    async extractJobDetails(pageText: string, pageUrl: string): Promise<{ description: string; requirements: string[] } | null> {
        try {
            const truncatedText = pageText.slice(0, 20000);

            const response = await this.openaiService.createChatCompletion(
                [
                    {
                        role: 'system', content: `Extract the full job description and list of requirements from this job posting page.
                    
RESPOND WITH ONLY VALID JSON:
{
  "description": "Full job description text",
  "requirements": ["requirement 1", "requirement 2", ...]
}` },
                    { role: 'user', content: truncatedText },
                ],
                'gpt-4o-mini',
                { temperature: 0 },
            );

            const content = response.choices[0].message.content;
            if (!content) return null;

            const jsonStr = content.replace(/```json\n?|\n?```/g, '').trim();
            return JSON.parse(jsonStr);
        } catch (error) {
            this.logger.error(`Failed to extract job details: ${error}`);
            return null;
        }
    }
}
