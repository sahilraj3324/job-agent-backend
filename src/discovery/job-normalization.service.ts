import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { ParsedJobDescription } from '../agents/jd-parser';

export interface NormalizedJob {
    role: string;
    skills: string[];
    location: string;
    jobHash: string;
}

@Injectable()
export class JobNormalizationService {
    /**
     * Normalize job data and generate hash
     */
    normalize(
        companyName: string,
        parsedJD: ParsedJobDescription,
        applyUrl: string,
        fetchedLocation: string,
    ): NormalizedJob {
        const role = this.normalizeRole(parsedJD.role);
        const skills = this.deduplicateSkills(parsedJD.skills);
        const location = this.normalizeLocation(parsedJD.location || fetchedLocation);

        // Generate stable hash
        const jobHash = this.generateJobHash(companyName, role, location, applyUrl);

        return {
            role,
            skills,
            location,
            jobHash,
        };
    }

    /**
     * Normalize job titles to standard roles
     */
    private normalizeRole(role: string): string {
        const r = role.toLowerCase();

        if (r.includes('frontend') || r.includes('front-end') || r.includes('front end')) return 'Frontend Engineer';
        if (r.includes('backend') || r.includes('back-end') || r.includes('back end')) return 'Backend Engineer';
        if (r.includes('fullstack') || r.includes('full-stack') || r.includes('full stack')) return 'Full Stack Engineer';
        if (r.includes('devops') || r.includes('sre') || r.includes('reliability')) return 'DevOps Engineer';
        if (r.includes('data scientist') || r.includes('ml') || r.includes('machine learning')) return 'Data Scientist';
        if (r.includes('product manager') || r.includes('pm')) return 'Product Manager';
        if (r.includes('sde') || r.includes('software engineer') || r.includes('developer')) return 'Software Engineer';

        // Capitalize words if not matched
        return role.replace(/\b\w/g, l => l.toUpperCase());
    }

    /**
     * Remove duplicates and normalize skills
     */
    private deduplicateSkills(skills: string[]): string[] {
        const unique = new Set<string>();
        const normalized: string[] = [];

        for (const skill of skills) {
            const lower = skill.toLowerCase().trim();
            if (!unique.has(lower)) {
                unique.add(lower);
                normalized.push(skill.trim());
            }
        }

        return normalized;
    }

    /**
     * Normalize location string
     */
    private normalizeLocation(location: string): string {
        if (!location) return 'Remote';

        const l = location.toLowerCase();
        if (l.includes('remote') || l.includes('wfh') || l.includes('anywhere')) return 'Remote';

        // Simple capitalization
        return location.replace(/\b\w/g, l => l.toUpperCase());
    }

    /**
     * Generate SHA-256 hash from job details
     */
    private generateJobHash(company: string, role: string, location: string, url: string): string {
        // We remove the protocol and query params from URL for better dedup stability
        const cleanUrl = url.split('?')[0].replace(/(^\w+:|^)\/\//, '').toLowerCase().replace(/\/$/, '');

        const data = `${company.toLowerCase()}:${role.toLowerCase()}:${location.toLowerCase()}:${cleanUrl}`;
        return crypto.createHash('sha256').update(data).digest('hex').slice(0, 16);
    }
}
