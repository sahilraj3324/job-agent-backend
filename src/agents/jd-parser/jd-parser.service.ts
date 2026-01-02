import { Injectable } from '@nestjs/common';
import { OpenAIService } from '../../openai';

export interface ParsedJobDescription {
    role: string;
    minExperience: number | null;
    maxExperience: number | null;
    skills: string[];
    location: string | null;
    employmentType: string | null;
}

@Injectable()
export class JDParserService {
    private readonly systemPrompt = `You are an expert job description parser. Extract and normalize structured information from job descriptions.

CRITICAL: You MUST respond with ONLY valid JSON. No markdown, no code blocks, no explanations, no text before or after the JSON.

OUTPUT SCHEMA:
{
  "role": "string",
  "minExperience": number | null,
  "maxExperience": number | null,
  "skills": ["string"],
  "location": "string | null",
  "employmentType": "string | null"
}

RULES:

1. JOB TITLE NORMALIZATION:
   - Normalize to standard titles: "Software Engineer", "Senior Software Engineer", "Staff Software Engineer", "Principal Software Engineer", "Engineering Manager", "Product Manager", "Data Scientist", "Data Engineer", "DevOps Engineer", "Frontend Engineer", "Backend Engineer", "Full Stack Engineer", "Mobile Engineer", "QA Engineer", "Security Engineer", "ML Engineer", "Cloud Engineer", "Site Reliability Engineer"
   - Map variations: "SDE" → "Software Engineer", "SWE" → "Software Engineer", "Dev" → "Software Engineer", "Programmer" → "Software Engineer"
   - Preserve seniority: "Sr.", "Senior", "Lead", "Staff", "Principal", "Junior", "Associate"
   - Example: "Sr. SDE II" → "Senior Software Engineer", "Lead Dev" → "Lead Software Engineer"

2. EXPERIENCE INFERENCE:
   - If explicit (e.g., "3-5 years"): minExperience=3, maxExperience=5
   - If single value (e.g., "5+ years"): minExperience=5, maxExperience=null
   - If only max (e.g., "up to 3 years"): minExperience=0, maxExperience=3
   - INFER from title if not stated:
     * Junior/Associate: minExperience=0, maxExperience=2
     * Mid-level (no prefix): minExperience=2, maxExperience=5
     * Senior: minExperience=5, maxExperience=8
     * Staff/Lead: minExperience=8, maxExperience=12
     * Principal/Architect: minExperience=10, maxExperience=null
   - If truly unknown and cannot infer: null

3. SKILLS PROCESSING:
   - Extract ALL technical skills: languages, frameworks, tools, platforms, methodologies
   - DEDUPLICATE: Remove exact duplicates (case-insensitive)
   - NORMALIZE names: "JS" → "JavaScript", "TS" → "TypeScript", "k8s" → "Kubernetes", "Mongo" → "MongoDB", "Postgres" → "PostgreSQL", "AWS" → "Amazon Web Services"
   - Return unique skills only, properly capitalized
   - Order by relevance (most important first)

4. LOCATION:
   - Normalize format: "City, Country" or "Remote"
   - "WFH", "Work from home" → "Remote"
   - Hybrid → include both location and note (e.g., "Bangalore, India (Hybrid)")

5. EMPLOYMENT TYPE:
   - Normalize to exactly one of: "Full-time", "Part-time", "Contract", "Internship", "Freelance"
   - "Permanent" → "Full-time"
   - "Remote" is NOT an employment type, it's a location
   - If not mentioned, infer "Full-time" as default for standard job posts`;

    constructor(private readonly openaiService: OpenAIService) { }

    async parse(rawJobDescription: string): Promise<ParsedJobDescription> {
        const response = await this.openaiService.createChatCompletion(
            [
                { role: 'system', content: this.systemPrompt },
                { role: 'user', content: rawJobDescription },
            ],
            'gpt-4o-mini',
            { temperature: 0 },
        );

        const content = response.choices[0].message.content;
        if (!content) {
            throw new Error('Empty response from OpenAI');
        }

        try {
            // Clean potential markdown code blocks
            const jsonStr = content.replace(/```json\n?|\n?```/g, '').trim();
            return JSON.parse(jsonStr) as ParsedJobDescription;
        } catch {
            throw new Error(`Failed to parse JSON response: ${content}`);
        }
    }
}
