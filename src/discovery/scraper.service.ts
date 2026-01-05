import { Injectable, Logger } from '@nestjs/common';
import puppeteer, { Browser, Page } from 'puppeteer';

export interface ScrapedPage {
    url: string;
    html: string;
    title: string;
}

@Injectable()
export class ScraperService {
    private readonly logger = new Logger(ScraperService.name);
    private browser: Browser | null = null;

    /**
     * Initialize headless browser
     */
    private async getBrowser(): Promise<Browser> {
        if (!this.browser) {
            this.browser = await puppeteer.launch({
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-gpu',
                ],
            });
        }
        return this.browser;
    }

    /**
     * Scrape a webpage and return its HTML content
     */
    async scrape(url: string): Promise<ScrapedPage | null> {
        const browser = await this.getBrowser();
        let page: Page | null = null;

        try {
            page = await browser.newPage();

            // Set realistic user agent
            await page.setUserAgent(
                'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            );

            // Navigate with timeout
            await page.goto(url, {
                waitUntil: 'networkidle2',
                timeout: 30000,
            });

            // Wait for content to load
            await page.waitForSelector('body', { timeout: 10000 });

            // Get page content
            const html = await page.content();
            const title = await page.title();

            this.logger.log(`Scraped: ${url} (${html.length} chars)`);

            return { url, html, title };
        } catch (error) {
            this.logger.error(`Failed to scrape ${url}: ${error}`);
            return null;
        } finally {
            if (page) {
                await page.close();
            }
        }
    }

    /**
     * Extract text content from HTML (simplified for LLM)
     */
    async scrapeText(url: string): Promise<string | null> {
        const browser = await this.getBrowser();
        let page: Page | null = null;

        try {
            page = await browser.newPage();

            await page.setUserAgent(
                'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
            );

            await page.goto(url, {
                waitUntil: 'networkidle2',
                timeout: 30000,
            });

            // Extract text content, removing scripts and styles
            const textContent = await page.evaluate(() => {
                // Remove script and style elements
                const scripts = document.querySelectorAll('script, style, nav, footer, header');
                scripts.forEach(el => el.remove());

                // Get main content area or body
                const main = document.querySelector('main') || document.querySelector('[role="main"]') || document.body;
                return main?.innerText || '';
            });

            this.logger.log(`Scraped text: ${url} (${textContent.length} chars)`);

            return textContent;
        } catch (error) {
            this.logger.error(`Failed to scrape text from ${url}: ${error}`);
            return null;
        } finally {
            if (page) {
                await page.close();
            }
        }
    }

    /**
     * Cleanup browser on shutdown
     */
    async onModuleDestroy() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
        }
    }
}
