import { Injectable, Logger } from '@nestjs/common';
import { Page } from 'playwright';
import { BrowserManager } from '../automation/playwright/browser.manager';
import { NaukriService } from '../naukri/naukri.service';
import * as path from 'path';
import * as fs from 'fs';

export interface ApplyResult {
  success: boolean;
  alreadyApplied?: boolean;
  statusText: 'APPLIED' | 'ALREADY_APPLIED' | 'SKIPPED' | 'FAILED';
  errorMessage?: string;
}

@Injectable()
export class NaukriApplyService {
  private readonly logger = new Logger(NaukriApplyService.name);

  constructor(
    private browserManager: BrowserManager,
    private naukriService: NaukriService,
  ) {}

  async applyToJob(userId: string, jobUrl: string, jobId: string): Promise<ApplyResult> {
    this.logger.log(`Starting Smart Auto-Apply for Job ID: ${jobId}`);

    const cookies = await this.naukriService.getDecryptedCookies(userId);
    if (!cookies || cookies.length === 0) {
      return {
        success: false,
        statusText: 'FAILED',
        errorMessage: 'Naukri session cookies missing.',
      };
    }

    let browser: any = null;

    try {
      const { browser: b, page } = await this.browserManager.createContext({ cookies });
      browser = b;

      // ─── STEP 1: Akamai Warm-Up ───
      this.logger.log('Warming up Akamai session on Naukri Dashboard...');
      await page.goto('https://www.naukri.com/mnjuser/homepage', {
        waitUntil: 'domcontentloaded',
        timeout: 25000,
      }).catch(() => {
        return page.goto('https://www.naukri.com/', { waitUntil: 'domcontentloaded', timeout: 25000 });
      });

      await page.waitForTimeout(2500);

      // ─── STEP 2: Navigate to Job Page ───
      this.logger.log(`Navigating to job page: ${jobUrl}`);
      await page.goto(jobUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(3000);

      // Check if session expired
      if (page.url().includes('/nlogin/login')) {
        return {
          success: false,
          statusText: 'FAILED',
          errorMessage: 'Naukri session expire ho gaya. Cookies re-sync karo.',
        };
      }

      // ─── STEP 3: Check if Already Applied ───
      const isAlreadyApplied = await this.checkIfApplied(page);
      if (isAlreadyApplied) {
        this.logger.log(`Job ${jobId} is ALREADY APPLIED.`);
        return { success: true, alreadyApplied: true, statusText: 'ALREADY_APPLIED' };
      }

      // ─── STEP 4: Find Main Apply Button ───
      this.logger.log('🔎 Looking for real Apply button...');
      const applySelectors = [
        'button#apply-button',
        'button.apply-button',
        '.apply-button-container button',
        'button.apply-main',
        'button:has-text("Apply")',
        '[class*="apply-button"]',
      ];

      let applyBtn = null;
      for (const sel of applySelectors) {
        const el = page.locator(sel).first();
        if (await el.isVisible().catch(() => false)) {
          applyBtn = el;
          break;
        }
      }

      if (!applyBtn) {
        const screenshotPath = await this.saveDebugScreenshot(page, jobId, 'no-button');
        this.logger.warn(`❌ No valid Apply button found for job ${jobId}. Screenshot saved: ${path.basename(screenshotPath)}`);
        return {
          success: false,
          statusText: 'FAILED',
          errorMessage: 'Apply button page par nahi mila.',
        };
      }

      const btnText = (await applyBtn.innerText().catch(() => '')).trim();
      this.logger.log(`Found apply button text: "${btnText}"`);

      // Skip external website redirects
      if (
        btnText.toLowerCase().includes('company site') ||
        btnText.toLowerCase().includes('website')
      ) {
        this.logger.log(`Job ${jobId} requires external redirect. SKIPPED.`);
        return {
          success: false,
          statusText: 'SKIPPED',
          errorMessage: 'Requires external company website redirect.',
        };
      }

      // ─── STEP 5: Attach Network Apply Response Listener ───
      let networkApplySuccess = false;
      const onApplyResponse = async (response: any) => {
        const url = response.url().toLowerCase();
        const status = response.status();
        if (
          (url.includes('/apply') || url.includes('/cloudgateway') || url.includes('/jobapi')) &&
          (status === 200 || status === 201)
        ) {
          try {
            const body = await response.text();
            if (
              body.includes('success') ||
              body.includes('APPLIED') ||
              body.includes('true') ||
              status === 200
            ) {
              networkApplySuccess = true;
              this.logger.log('📡 Background Apply API HTTP 200 SUCCESS intercepted!');
            }
          } catch {}
        }
      };

      page.on('response', onApplyResponse);

      // ─── STEP 6: Click Apply & Handle Drawer ───
      this.logger.log('Clicking Apply button...');
      await applyBtn.click({ force: true, timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(3000);

      await this.handleNaukriPopupsAndChatbot(page);

      await page.waitForTimeout(3000);
      page.off('response', onApplyResponse);

      // ─── STEP 7: Final Success Verification ───
      const verifiedByUi = await this.checkIfApplied(page);

      if (networkApplySuccess || verifiedByUi) {
        this.logger.log(`✅ SUCCESS! Successfully Applied to Job ${jobId}!`);
        return { success: true, statusText: 'APPLIED' };
      }

      const screenshotPath = await this.saveDebugScreenshot(page, jobId, 'apply-unverified');
      this.logger.warn(`Apply confirmation not verified. Saved debug screenshot: ${path.basename(screenshotPath)}`);

      return {
        success: false,
        statusText: 'FAILED',
        errorMessage: 'Apply click completed but confirmation badge not detected.',
      };
    } catch (err: any) {
      this.logger.error(`Exception during apply for job ${jobId}: ${err.message}`);
      return {
        success: false,
        statusText: 'FAILED',
        errorMessage: err.message,
      };
    } finally {
      if (browser) {
        await this.browserManager.close(browser);
      }
    }
  }

  private async checkIfApplied(page: Page): Promise<boolean> {
    const appliedSelectors = [
      'button:has-text("Applied")',
      'span:has-text("Applied")',
      'div:has-text("successfully applied")',
      'div:has-text("Application sent")',
      'span:has-text("You have applied")',
      'div:has-text("applied for this job")',
      'span:has-text("Application submitted")',
      'div:has-text("Congratulations")',
      '.already-applied',
      '[class*="already-applied"]',
      '[class*="applied-message"]',
      '[class*="applySuccess"]',
    ];

    for (const sel of appliedSelectors) {
      if (await page.locator(sel).first().isVisible().catch(() => false)) {
        return true;
      }
    }

    return false;
  }

  private async handleNaukriPopupsAndChatbot(page: Page) {
    try {
      for (let step = 0; step < 4; step++) {
        if (await this.checkIfApplied(page)) break;

        const continueBtn = page
          .locator(
            'button:has-text("Apply without updating"), button:has-text("Continue to apply"), button:has-text("Skip & Apply"), button:has-text("Skip")',
          )
          .first();

        if (await continueBtn.isVisible().catch(() => false)) {
          this.logger.log('Popup detected: "Apply without updating resume". Clicking...');
          await continueBtn.click({ force: true, timeout: 3000 }).catch(() => {});
          await page.waitForTimeout(2000);
          continue;
        }

        const drawerSelectors = ['.chatbot_Drawer', '[class*="drawer"]', '.custom-questions-modal', '[class*="chatbot"]'];
        let drawer = null;
        for (const sel of drawerSelectors) {
          const el = page.locator(sel).first();
          if (await el.isVisible().catch(() => false)) {
            drawer = el;
            break;
          }
        }

        if (drawer) {
          this.logger.log(`Questionnaire drawer step ${step + 1} detected. Answering...`);

          const options = drawer.locator('input[type="radio"], label, .option, .chip, li[class*="option"]').first();
          if (await options.isVisible().catch(() => false)) {
            await options.click({ force: true, timeout: 3000 }).catch(() => {});
            await page.waitForTimeout(1000);
          }

          const textInputs = drawer.locator('input[type="text"], input[type="number"], textarea');
          const inputCount = await textInputs.count().catch(() => 0);
          for (let i = 0; i < inputCount; i++) {
            const input = textInputs.nth(i);
            const val = await input.inputValue().catch(() => '');
            if (!val) {
              await input.fill('15', { timeout: 3000 }).catch(() => {});
            }
          }

          const submitBtn = drawer
            .locator('button:has-text("Save & Apply"), button:has-text("Submit"), button:has-text("Next"), button:has-text("Continue"), button:has-text("Apply")')
            .first();

          if (await submitBtn.isVisible().catch(() => false)) {
            this.logger.log('Clicking drawer submit button...');
            await submitBtn.click({ force: true, timeout: 3000 }).catch(() => {});
            await page.waitForTimeout(2500);
            continue;
          }
        }

        break;
      }
    } catch (e: any) {
      this.logger.warn(`Popup handling notice: ${e.message}`);
    }
  }

  private async saveDebugScreenshot(page: Page, jobId: string, prefix: string): Promise<string> {
    try {
      const dir = path.join(process.cwd(), 'uploads', 'debug');
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

      const filename = `${prefix}-${jobId}-${Date.now()}.png`;
      const filepath = path.join(dir, filename);
      await page.screenshot({ path: filepath, fullPage: false });
      return filepath;
    } catch {
      return '';
    }
  }
}
