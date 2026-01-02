import { Injectable } from '@nestjs/common';

export type ATSType = 'greenhouse' | 'lever' | 'workday' | 'ashby' | 'bamboohr' | 'smartrecruiters' | 'other' | 'unknown';

@Injectable()
export class ATSDetectionService {
    private readonly patterns: { type: ATSType; patterns: RegExp[] }[] = [
        {
            type: 'greenhouse',
            patterns: [
                /greenhouse\.io/i,
                /boards\.greenhouse\.io/i,
                /job\.greenhouse\.io/i,
            ],
        },
        {
            type: 'lever',
            patterns: [
                /lever\.co/i,
                /jobs\.lever\.co/i,
            ],
        },
        {
            type: 'workday',
            patterns: [
                /workday\.com/i,
                /myworkdayjobs\.com/i,
                /wd\d+\.myworkdayjobs\.com/i,
            ],
        },
        {
            type: 'ashby',
            patterns: [
                /ashbyhq\.com/i,
                /jobs\.ashbyhq\.com/i,
            ],
        },
        {
            type: 'bamboohr',
            patterns: [
                /bamboohr\.com/i,
                /\.bamboohr\.com\/jobs/i,
            ],
        },
        {
            type: 'smartrecruiters',
            patterns: [
                /smartrecruiters\.com/i,
                /jobs\.smartrecruiters\.com/i,
            ],
        },
    ];

    /**
     * Detect ATS type from career page URL
     * @param careerPageUrl Career page or job listing URL
     * @returns ATS type enum value
     */
    detect(careerPageUrl: string): ATSType {
        const url = careerPageUrl.toLowerCase();

        for (const { type, patterns } of this.patterns) {
            for (const pattern of patterns) {
                if (pattern.test(url)) {
                    return type;
                }
            }
        }

        return 'unknown';
    }

    /**
     * Check if a specific ATS type is detected
     */
    isATS(careerPageUrl: string, atsType: ATSType): boolean {
        return this.detect(careerPageUrl) === atsType;
    }

    /**
     * Get all supported ATS types
     */
    getSupportedTypes(): ATSType[] {
        return this.patterns.map((p) => p.type);
    }
}
