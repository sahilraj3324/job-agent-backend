import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Company } from '../companies/schemas/company.schema';
import { OpenAIService } from '../openai';

export interface DiscoveredCompany {
    name: string;
    homepageUrl: string;
    industry?: string;
    isNew: boolean;
}

@Injectable()
export class CompanyDiscoveryAgent {
    private readonly logger = new Logger(CompanyDiscoveryAgent.name);

    // Industry categories for diverse discovery
    private readonly industryQueries = [
        'top AI and machine learning startups hiring',
        'best fintech companies with open positions',
        'developer tools and DevOps companies hiring engineers',
        'SaaS companies with remote jobs',
        'Y Combinator backed startups hiring',
        'fast growing tech startups in India',
        'top cybersecurity companies hiring',
        'cloud infrastructure companies with jobs',
        'collaboration and productivity software companies',
        'e-commerce tech companies hiring developers',
    ];

    constructor(
        @InjectModel(Company.name) private readonly companyModel: Model<Company>,
        private readonly openaiService: OpenAIService,
    ) { }

    /**
     * Discover tech companies using LLM
     */
    async discoverCompanies(count: number = 30): Promise<DiscoveredCompany[]> {
        const allDiscovered: DiscoveredCompany[] = [];
        const seenNames = new Set<string>();

        // Use multiple industry queries to get diverse companies
        const queriesToUse = this.industryQueries.slice(0, Math.ceil(count / 10));

        for (const query of queriesToUse) {
            if (allDiscovered.length >= count) break;

            this.logger.log(`Discovering companies: "${query}"`);
            const companies = await this.discoverFromQuery(query);

            for (const company of companies) {
                const normalizedName = company.name.toLowerCase();
                if (!seenNames.has(normalizedName)) {
                    seenNames.add(normalizedName);
                    allDiscovered.push(company);
                }
            }

            // Small delay between queries
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        this.logger.log(`Discovered ${allDiscovered.length} unique companies total`);
        return allDiscovered.slice(0, count);
    }

    /**
     * Use LLM to discover companies from a search query
     */
    async discoverFromQuery(query: string): Promise<DiscoveredCompany[]> {
        try {
            const response = await this.openaiService.createChatCompletion(
                [
                    {
                        role: 'system',
                        content: `You are a tech company researcher. Given a search query, suggest real tech companies that match.

CRITICAL: Respond with ONLY valid JSON. No markdown, no code blocks, no explanation.

OUTPUT FORMAT:
{"companies":[{"name":"Company Name","homepageUrl":"https://company.com","industry":"AI/ML"}]}

RULES:
1. Only suggest REAL tech companies with valid websites
2. Include a mix of well-known and emerging companies
3. URLs must be real and start with https://
4. Suggest 15-20 companies per query
5. Focus on companies that are likely hiring
6. Industry: AI/ML, Fintech, SaaS, Developer Tools, E-commerce, Healthcare, Security, Cloud, Collaboration, Other`,
                    },
                    {
                        role: 'user',
                        content: query,
                    },
                ],
                'gpt-4o-mini',
                { temperature: 0.8 },
            );

            const content = response.choices[0].message.content;
            if (!content) return [];

            // Clean up response
            let jsonStr = content.trim();
            // Remove markdown code blocks if present
            jsonStr = jsonStr.replace(/```json\n?|\n?```/g, '').trim();
            // Remove any leading/trailing non-JSON characters
            const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                this.logger.warn('No JSON found in LLM response');
                return [];
            }

            const parsed = JSON.parse(jsonMatch[0]);
            const companies: DiscoveredCompany[] = [];

            for (const c of parsed.companies || []) {
                if (c.name && c.homepageUrl && c.homepageUrl.startsWith('http')) {
                    const existing = await this.companyModel.findOne({
                        name: { $regex: new RegExp(`^${c.name}$`, 'i') }
                    }).exec();
                    companies.push({
                        name: c.name,
                        homepageUrl: c.homepageUrl,
                        industry: c.industry || 'Other',
                        isNew: !existing,
                    });
                }
            }

            this.logger.log(`Discovered ${companies.length} companies for: "${query}"`);
            return companies;
        } catch (error) {
            this.logger.error(`Failed to discover from query "${query}": ${error}`);
            return [];
        }
    }

    /**
     * Save discovered companies to database
     */
    async saveDiscoveredCompanies(companies: DiscoveredCompany[]): Promise<number> {
        let saved = 0;

        for (const company of companies) {
            if (company.isNew) {
                try {
                    // Check again to avoid race conditions
                    const existing = await this.companyModel.findOne({
                        name: { $regex: new RegExp(`^${company.name}$`, 'i') }
                    }).exec();

                    if (!existing) {
                        await this.companyModel.create({
                            name: company.name,
                            homepageUrl: company.homepageUrl,
                        });
                        saved++;
                    }
                } catch (error: any) {
                    // Duplicate key or other error
                    if (error.code !== 11000) {
                        this.logger.warn(`Failed to save ${company.name}: ${error.message}`);
                    }
                }
            }
        }

        this.logger.log(`Saved ${saved} new companies to database`);
        return saved;
    }
}

