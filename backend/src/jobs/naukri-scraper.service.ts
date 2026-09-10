import { Injectable, Logger } from '@nestjs/common';
import { NaukriService } from '../naukri/naukri.service';
import { BrowserManager } from '../automation/playwright/browser.manager';
import {
  parseSalary,
  parseExperience,
} from './utils/naukri-parser.util';

export interface ScrapedJobItem {
  naukriJobId: string;
  title: string;
  company: string;
  companyRating?: number;
  companyReviews?: number;
  location: string;
  experience: string;
  experienceMin?: number;
  experienceMax?: number;
  salary: string;
  salaryMin?: number;
  salaryMax?: number;
  description: string;
  skills: string[];
  url: string;
  isEasyApply: boolean;
  postedDate?: Date;
}

@Injectable()
export class NaukriScraperService {
  private readonly logger = new Logger(NaukriScraperService.name);

  constructor(
    private naukriService: NaukriService,
    private browserManager: BrowserManager,
  ) {}

  // Helper to convert "X Days Ago" into a real Date object
  private parseNaukriDate(label: string): Date {
    const now = new Date();
    if (!label) return now;

    const lowerLabel = label.toLowerCase();
    
    if (lowerLabel.includes('just now') || lowerLabel.includes('today')) {
      return now;
    }

    // "1 Day Ago", "2 Days Ago"
    const daysMatch = lowerLabel.match(/(\d+)\s*day/);
    if (daysMatch) {
      now.setDate(now.getDate() - parseInt(daysMatch[1], 10));
      return now;
    }

    // "30+ Days Ago"
    if (lowerLabel.includes('30+')) {
      now.setDate(now.getDate() - 31);
      return now;
    }

    // "Few hours ago"
    if (lowerLabel.includes('hour')) {
      return now;
    }

    return now;
  }

  async scrapeByQuery(
    userId: string,
    keyword: string = 'devops',
    location: string = '',
    experience?: number,
    pagesToScrape: number = 1,
  ): Promise<ScrapedJobItem[]> {
    const cleanKeyword = keyword.trim() || 'devops';
    this.logger.log(`Starting simple search for Keyword: "${cleanKeyword}"`);

    const cookies = await this.naukriService.getDecryptedCookies(userId);
    let browser: any = null;
    const allJobs: ScrapedJobItem[] = [];

    try {
      const { browser: b, page } = await this.browserManager.createContext({
        cookies: cookies || undefined,
      });
      browser = b;

      this.logger.log('Warming up session on Naukri...');
      await page.goto('https://www.naukri.com/', {
        waitUntil: 'domcontentloaded',
        timeout: 25000,
      }).catch(() => {});

      await page.waitForTimeout(2000);

      const kwFormatted = cleanKeyword.toLowerCase().replace(/\s+/g, '-');
      let searchUrl = `https://www.naukri.com/${kwFormatted}-jobs?k=${encodeURIComponent(cleanKeyword)}`;

      if (location && location.trim().length > 0) {
        const locFormatted = location.toLowerCase().trim().replace(/\s+/g, '-');
        searchUrl = `https://www.naukri.com/${kwFormatted}-jobs-in-${locFormatted}?k=${encodeURIComponent(cleanKeyword)}&l=${encodeURIComponent(location)}`;
      }

      for (let pageNo = 1; pageNo <= pagesToScrape; pageNo++) {
        let capturedJson: any = null;
        const currentUrl = pageNo === 1 ? searchUrl : `${searchUrl}&pageNo=${pageNo}`;

        const onResponse = async (response: any) => {
          const url = response.url();
          if (url.includes('/jobapi/v3/search') && response.status() === 200) {
            try {
              capturedJson = await response.json();
            } catch {}
          }
        };

        page.on('response', onResponse);
        this.logger.log(`Opening URL: ${currentUrl}`);
        await page.goto(currentUrl, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});

        await page.waitForTimeout(4000);
        page.off('response', onResponse);

        if (capturedJson && Array.isArray(capturedJson.jobDetails)) {
          const apiJobs = this.parseNaukriApiJson(capturedJson.jobDetails);
          allJobs.push(...apiJobs);
        }
      }

      return allJobs;
    } catch (err: any) {
      this.logger.error(`Scrape failed: ${err.message}`);
      return allJobs;
    } finally {
      if (browser) await this.browserManager.close(browser);
    }
  }

  private parseNaukriApiJson(jobDetails: any[]): ScrapedJobItem[] {
    const scrapedItems: ScrapedJobItem[] = [];

    for (const job of jobDetails) {
      try {
        const jobId = String(job.jobId || '');
        const title = job.title || '';
        const company = job.companyName || 'Unknown Company';
        
        // ─── EXTRACT REAL POSTED TIME ───
        const postedLabel = job.footerPlaceholderLabel || ''; // e.g., "1 Day Ago"
        const postedDate = this.parseNaukriDate(postedLabel);

        let expText = '0-5 Yrs';
        let salaryText = 'Not Disclosed';
        let locationText = 'India';

        if (Array.isArray(job.placeholders)) {
          for (const p of job.placeholders) {
            if (p.type === 'experience') expText = p.label || expText;
            if (p.type === 'salary') salaryText = p.label || salaryText;
            if (p.type === 'location') locationText = p.label || locationText;
          }
        }

        const description = job.jobDescription || job.snippet || '';

        const skills: string[] = [];
        if (Array.isArray(job.tagsAndSkills)) {
          skills.push(...job.tagsAndSkills);
        }

        const jobUrl = job.jdURL
          ? `https://www.naukri.com${job.jdURL}`
          : `https://www.naukri.com/job-listings-${jobId}`;

        const parsedSal = parseSalary(salaryText);
        const parsedExp = parseExperience(expText);

        const isExternalSite = Boolean(job.companyApplyJob === true || job.companyApplyUrl || job.applyRedirectUrl);

        scrapedItems.push({
          naukriJobId: jobId,
          title,
          company,
          location: locationText,
          experience: expText,
          experienceMin: parsedExp.experienceMin,
          experienceMax: parsedExp.experienceMax,
          salary: salaryText,
          salaryMin: parsedSal.salaryMin,
          salaryMax: parsedSal.salaryMax,
          description,
          skills,
          url: jobUrl,
          isEasyApply: !isExternalSite,
          postedDate: postedDate, // ✅ Real Date Saved
        });
      } catch {}
    }

    return scrapedItems;
  }
}
