import { Injectable, Logger } from '@nestjs/common';
import { chromium } from 'playwright-extra';
import stealthPlugin from 'puppeteer-extra-plugin-stealth';
import { Browser, BrowserContext, Page } from 'playwright';

chromium.use(stealthPlugin());

@Injectable()
export class BrowserManager {
  private readonly logger = new Logger(BrowserManager.name);

  async createContext(options?: {
    userAgent?: string;
    cookies?: any[];
  }): Promise<{ browser: Browser; context: BrowserContext; page: Page }> {
    this.logger.log('Launching Stealth Chromium...');

    const browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-blink-features=AutomationControlled',
        '--window-size=1920,1080',
      ],
    });

    const validCookies = (options?.cookies || []).map((c: any) => ({
      name: c.name,
      value: c.value,
      domain: c.domain?.startsWith('.') ? c.domain : `.naukri.com`,
      path: c.path || '/',
      secure: c.secure ?? true,
      httpOnly: c.httpOnly ?? false,
      sameSite: (c.sameSite === 'None' || c.sameSite === 'Lax' || c.sameSite === 'Strict') ? c.sameSite : 'Lax',
    }));

    const context = await browser.newContext({
      userAgent:
        options?.userAgent ||
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 },
      locale: 'en-US,en;q=0.9',
      timezoneId: 'Asia/Kolkata',
      extraHTTPHeaders: {
        'Accept-Language': 'en-US,en;q=0.9',
        'sec-ch-ua': '"Chromium";v="128", "Not=A?Brand";v="24", "Google Chrome";v="128"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
      },
    });

    if (validCookies.length > 0) {
      try {
        await context.addCookies(validCookies);
        this.logger.log(`Injected ${validCookies.length} normalized cookies`);
      } catch (e: any) {
        this.logger.warn(`Cookie injection warning: ${e.message}`);
      }
    }

    const page = await context.newPage();

    return { browser, context, page };
  }

  async close(browser: Browser) {
    try {
      await browser.close();
      this.logger.log('Browser closed');
    } catch (err) {
      this.logger.error('Error closing browser', err);
    }
  }
}
