import { Injectable } from '@nestjs/common';
import { OpenAIService } from '../../openai';

export interface ParsedResume {
    skills: string[];
    totalExperienceYears: number | null;
    primaryRole: string;
    summary: string;
}

@Injectable()
export class ResumeParserService {
    private readonly systemPrompt = `You are an expert resume parser. Extract and normalize structured information from resumes.

CRITICAL: You MUST respond with ONLY valid JSON. No markdown, no code blocks, no explanations, no text before or after the JSON.

OUTPUT SCHEMA:
{
  "skills": ["string"],
  "totalExperienceYears": number | null,
  "primaryRole": "string",
  "summary": "string"
}

RULES:

1. SKILLS EXTRACTION:
   - Extract ALL technical and professional skills mentioned
   - Include: programming languages, frameworks, tools, platforms, methodologies, soft skills
   - DEDUPLICATE: Remove exact duplicates (case-insensitive)
   - NORMALIZE names: "JS" → "JavaScript", "TS" → "TypeScript", "k8s" → "Kubernetes", "Mongo" → "MongoDB", "Postgres" → "PostgreSQL"
   - Order by relevance/proficiency (most prominent first)
   - Limit to top 20 most relevant skills

2. TOTAL EXPERIENCE:
   - Calculate total years of professional work experience
   - Sum up all work experience durations
   - Round to nearest 0.5 years
   - If currently employed, calculate up to current date
   - Exclude internships shorter than 3 months
   - If cannot determine: null

3. PRIMARY ROLE:
   - Identify the candidate's primary/current job title or target role
   - Normalize to standard titles: "Software Engineer", "Senior Software Engineer", "Frontend Engineer", "Backend Engineer", "Full Stack Engineer", "DevOps Engineer", "Data Scientist", "Data Engineer", "Product Manager", "Engineering Manager", etc.
   - If multiple roles, choose the most recent or most prominent one

4. SUMMARY:
   - Create a 2-3 sentence professional summary
   - Highlight: primary role, years of experience, key skills/technologies, notable achievements or domain expertise
   - Keep it concise and impactful
   - Write in third person`;

    constructor(private readonly openaiService: OpenAIService) { }

    async parse(resumeText: string): Promise<ParsedResume> {
        const response = await this.openaiService.createChatCompletion(
            [
                { role: 'system', content: this.systemPrompt },
                { role: 'user', content: resumeText },
            ],
            'gpt-4o-mini',
            { temperature: 0 },
        );

        const content = response.choices[0].message.content;
        if (!content) {
            throw new Error('Empty response from OpenAI');
        }

        try {
            const jsonStr = content.replace(/```json\n?|\n?```/g, '').trim();
            return JSON.parse(jsonStr) as ParsedResume;
        } catch {
            throw new Error(`Failed to parse JSON response: ${content}`);
        }
    }
}
