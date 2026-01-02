import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class CareerPageDiscoveryService {
    private readonly logger = new Logger(CareerPageDiscoveryService.name);

    private readonly commonPaths = [
        '/careers',
        '/jobs',
        '/work-with-us',
        '/join-us',
        '/career',
        '/job',
        '/hiring',
        '/opportunities',
        '/open-positions',
    ];

    private readonly keywords = [
        'career',
        'careers',
        'job',
        'jobs',
        'hiring',
        'join',
        'work-with-us',
        'opportunities',
        'open-positions',
        'openings',
    ];

    /**
     * Discover career page URL from company homepage
     * @param homepageUrl Company homepage URL (e.g., https://example.com)
     * @returns Career page URL or null if not found
     */
    async discoverCareerPage(homepageUrl: string): Promise<string | null> {
        const baseUrl = this.normalizeUrl(homepageUrl);

        // Step 1: Try common career page paths
        const pathResult = await this.tryCommonPaths(baseUrl);
        if (pathResult) {
            this.logger.log(`Found career page via common path: ${pathResult}`);
            return pathResult;
        }

        // Step 2: Fetch homepage and scan for career links
        const linkResult = await this.scanHomepageLinks(baseUrl);
        if (linkResult) {
            this.logger.log(`Found career page via link scan: ${linkResult}`);
            return linkResult;
        }

        this.logger.warn(`No career page found for: ${baseUrl}`);
        return null;
    }

    /**
     * Try common career page paths
     */
    private async tryCommonPaths(baseUrl: string): Promise<string | null> {
        for (const path of this.commonPaths) {
            const url = `${baseUrl}${path}`;
            try {
                const response = await axios.head(url, {
                    timeout: 5000,
                    maxRedirects: 3,
                    validateStatus: (status) => status < 400,
                });
                if (response.status < 400) {
                    return url;
                }
            } catch {
                // Path doesn't exist, continue
            }
        }
        return null;
    }

    /**
     * Scan homepage HTML for career links
     */
    private async scanHomepageLinks(baseUrl: string): Promise<string | null> {
        try {
            const response = await axios.get(baseUrl, {
                timeout: 10000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (compatible; JobAgent/1.0)',
                },
            });

            const html = response.data as string;
            const links = this.extractLinks(html, baseUrl);

            // Score and sort links by keyword matches
            const scoredLinks = links
                .map((link) => ({
                    url: link,
                    score: this.scoreLink(link),
                }))
                .filter((l) => l.score > 0)
                .sort((a, b) => b.score - a.score);

            return scoredLinks.length > 0 ? scoredLinks[0].url : null;
        } catch (error) {
            this.logger.error(`Failed to fetch homepage: ${baseUrl}`, error);
            return null;
        }
    }

    /**
     * Extract all <a> href links from HTML
     */
    private extractLinks(html: string, baseUrl: string): string[] {
        const linkRegex = /<a[^>]+href=["']([^"']+)["']/gi;
        const links: string[] = [];
        let match: RegExpExecArray | null;

        while ((match = linkRegex.exec(html)) !== null) {
            const href = match[1];
            const absoluteUrl = this.resolveUrl(href, baseUrl);
            if (absoluteUrl && this.isSameDomain(absoluteUrl, baseUrl)) {
                links.push(absoluteUrl);
            }
        }

        return [...new Set(links)]; // Deduplicate
    }

    /**
     * Score a link based on career-related keywords
     */
    private scoreLink(url: string): number {
        const lowerUrl = url.toLowerCase();
        let score = 0;

        for (const keyword of this.keywords) {
            if (lowerUrl.includes(keyword)) {
                score += 1;
                // Boost if keyword is in path (not just query params)
                if (new URL(url).pathname.toLowerCase().includes(keyword)) {
                    score += 2;
                }
            }
        }

        return score;
    }

    /**
     * Resolve relative URL to absolute
     */
    private resolveUrl(href: string, baseUrl: string): string | null {
        try {
            if (href.startsWith('http')) {
                return href;
            }
            if (href.startsWith('//')) {
                return `https:${href}`;
            }
            if (href.startsWith('/')) {
                return `${baseUrl}${href}`;
            }
            if (href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:')) {
                return null;
            }
            return `${baseUrl}/${href}`;
        } catch {
            return null;
        }
    }

    /**
     * Check if URL is on the same domain
     */
    private isSameDomain(url: string, baseUrl: string): boolean {
        try {
            const urlHost = new URL(url).hostname;
            const baseHost = new URL(baseUrl).hostname;
            return urlHost === baseHost || urlHost.endsWith(`.${baseHost}`);
        } catch {
            return false;
        }
    }

    /**
     * Normalize URL (remove trailing slash, ensure https)
     */
    private normalizeUrl(url: string): string {
        let normalized = url.trim();
        if (!normalized.startsWith('http')) {
            normalized = `https://${normalized}`;
        }
        return normalized.replace(/\/+$/, '');
    }
}
