import { Logger } from '@nestjs/common';
import { Page, BrowserContext, Cookie } from 'playwright';
import * as path from 'path';

const logger = new Logger('NaukriLogin');

export interface NaukriLoginResult {
  success: boolean;
  cookies?: Cookie[];
  error?: string;
  needsOTP?: boolean;
  needsCaptcha?: boolean;
  userName?: string;
}

export async function performNaukriLogin(
  page: Page,
  context: BrowserContext,
  email: string,
  password: string,
): Promise<NaukriLoginResult> {
  try {
    logger.log(`Navigating to Naukri login page for: ${email}`);

    // Direct login page
    await page.goto('https://www.naukri.com/nlogin/login', {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });

    // Wait 3 seconds for client-side JS to render
    await page.waitForTimeout(3000);

    // Check if Cloudflare / Akamai Block page hit
    const pageTitle = await page.title();
    const pageContent = await page.content();

    if (
      pageTitle.includes('Access Denied') ||
      pageTitle.includes('Attention Required') ||
      pageContent.includes('challenge-running') ||
      pageContent.includes('Incapsula')
    ) {
      const screenshotPath = path.join(process.cwd(), 'debug-blocked.png');
      await page.screenshot({ path: screenshotPath, fullPage: true });
      logger.error(`Naukri WAF block detected! Saved screenshot to ${screenshotPath}`);
      return {
        success: false,
        error: 'Naukri ne Azure Cloud IP ko block kar diya. Cookie method use karein.',
      };
    }

    // ─── Step 1: Find Username field with multiple selectors ───
    const usernameSelectors = [
      'input#usernameField',
      'input[placeholder*="Email" i]',
      'input[placeholder*="Username" i]',
      'input[type="text"]',
      'input[type="email"]',
    ];

    let emailField = null;
    for (const sel of usernameSelectors) {
      const el = page.locator(sel).first();
      if (await el.isVisible().catch(() => false)) {
        emailField = el;
        logger.log(`Found username input using selector: ${sel}`);
        break;
      }
    }

    if (!emailField) {
      // Screenshot for debugging
      const screenshotPath = path.join(process.cwd(), 'debug-login-failed.png');
      await page.screenshot({ path: screenshotPath, fullPage: true });
      logger.error(`Username field nahi mila. Screenshot saved: ${screenshotPath}`);

      return {
        success: false,
        error: 'Naukri login page form load nahi hua. Check debug-login-failed.png',
      };
    }

    // Fill Email with human typing speed
    await emailField.click();
    await page.waitForTimeout(300);
    await emailField.fill('');
    await emailField.pressSequentially(email, { delay: 60 });
    logger.log('Email filled');

    // ─── Step 2: Find Password Field ───
    const passwordSelectors = [
      'input#passwordField',
      'input[type="password"]',
      'input[placeholder*="password" i]',
    ];

    let passField = null;
    for (const sel of passwordSelectors) {
      const el = page.locator(sel).first();
      if (await el.isVisible().catch(() => false)) {
        passField = el;
        break;
      }
    }

    if (!passField) {
      return { success: false, error: 'Password field nahi mila' };
    }

    await passField.click();
    await page.waitForTimeout(300);
    await passField.fill('');
    await passField.pressSequentially(password, { delay: 60 });
    logger.log('Password filled');

    // ─── Step 3: Click Login Button ───
    const buttonSelectors = [
      'button[data-type="loginSubmit"]',
      'button:has-text("Login")',
      'button[type="submit"]',
      '.btn-primary',
    ];

    let submitBtn = null;
    for (const sel of buttonSelectors) {
      const el = page.locator(sel).first();
      if (await el.isVisible().catch(() => false)) {
        submitBtn = el;
        break;
      }
    }

    if (submitBtn) {
      await submitBtn.click();
    } else {
      await passField.press('Enter');
    }
    logger.log('Login submitted. Waiting for response...');

    // Wait for Naukri to complete the normal login flow.
    await page.waitForTimeout(6000);

    const currentUrl = page.url();
    const loginResponseTitle = await page.title().catch(() => '');

    logger.log(`Login response URL: ${currentUrl}`);
    logger.log(`Login response title: ${loginResponseTitle}`);

    // ─── Detect Naukri OTP verification screen ───
    // Naukri currently renders OTP as six separate tel inputs:
    // Input_1 ... Input_6 with a Verify button.
    const otpInputCount = await page
      .locator('input[id^="Input_"]')
      .count()
      .catch(() => 0);

    const otpPageText = await page
      .locator('body')
      .innerText()
      .catch(() => '');

    const hasOtpMessage =
      /enter the otp sent to/i.test(otpPageText) ||
      /enter otp/i.test(otpPageText);

    const hasVerifyButton = await page
      .getByRole('button', { name: /^Verify$/i })
      .count()
      .catch(() => 0);

    if (
      (otpInputCount >= 4 && hasVerifyButton > 0) ||
      (hasOtpMessage && hasVerifyButton > 0)
    ) {
      logger.log(
        `Naukri OTP screen detected (${otpInputCount} OTP input fields)`,
      );

      return {
        success: false,
        needsOTP: true,
        error: 'Naukri OTP verification required.',
      };
    }



    const visibleText = await page.locator('body').innerText().catch(() => '');

    logger.log(
      `Login page visible text preview: ${visibleText
        .replace(/\s+/g, ' ')
        .slice(0, 1200)}`,
    );

    const inputs = await page.locator('input').evaluateAll((els) =>
      els.map((el: any) => ({
        type: el.type || '',
        name: el.name || '',
        id: el.id || '',
        placeholder: el.placeholder || '',
        autocomplete: el.autocomplete || '',
      })),
    );

    logger.log(`Login page inputs: ${JSON.stringify(inputs)}`);

    const buttons = await page.locator('button').evaluateAll((els) =>
      els
        .map((el: any) => (el.innerText || '').trim())
        .filter(Boolean)
        .slice(0, 20),
    );

    logger.log(`Login page buttons: ${JSON.stringify(buttons)}`);

    // Check visible login/server errors.
    const errorSelectors = [
      '.errormsg',
      '.error-msg',
      '.server-err',
      '[class*="server-error"]',
      '[class*="error"]',
    ];

    let errorMsg: string | null = null;

    for (const selector of errorSelectors) {
      const text = await page
        .locator(selector)
        .first()
        .textContent()
        .catch(() => null);

      if (text && text.trim().length > 0) {
        errorMsg = text.trim();
        break;
      }
    }

    if (errorMsg) {
      logger.warn(`❌ Naukri login error detected: ${errorMsg}`);

      const debugPath = path.join(
        process.cwd(),
        'debug-login-error.png',
      );

      await page.screenshot({
        path: debugPath,
        fullPage: true,
      });

      return {
        success: false,
        error: `Naukri error: ${errorMsg}`,
      };
    }

    // Check if OTP is requested.
    const isOtp = await page
      .locator(
        '#otpField, input[name="otp"], input[autocomplete="one-time-code"], .otp-container',
      )
      .first()
      .isVisible()
      .catch(() => false);

    if (isOtp) {
      logger.warn('⚠️ Naukri requested OTP.');

      return {
        success: false,
        needsOTP: true,
        error: 'Naukri ne OTP maang liya hai. Phone check karo.',
      };
    }

    // Check whether Naukri actually left the login page.
    const stillOnLoginPage =
      currentUrl.includes('/nlogin/login');

    if (stillOnLoginPage) {
      logger.warn(
        `❌ Naukri login did not complete. Still on login page: ${currentUrl}`,
      );

      const debugPath = path.join(
        process.cwd(),
        'debug-login-not-completed.png',
      );

      await page.screenshot({
        path: debugPath,
        fullPage: true,
      });

      return {
        success: false,
        error:
          `Naukri login did not complete. Current URL: ${currentUrl}`,
      };
    }

    // Only now inspect cookies. Cookie presence alone is not treated
    // as proof of authentication.
    const cookies = await context.cookies();

    logger.log(
      `Naukri login left login page. Cookie count: ${cookies.length}`,
    );

    logger.log('✅ Naukri Login Successfully verified!');

    return {
      success: true,
      cookies,
      userName: email,
    };
  } catch (err: any) {
    logger.error(`Login error: ${err.message}`);
    return {
      success: false,
      error: err.message,
    };
  }
}

export async function verifyNaukriSession(
  page: Page,
  context: BrowserContext,
): Promise<{ valid: boolean; userName?: string }> {
  try {
    await page.goto('https://www.naukri.com/mnjuser/homepage', {
      waitUntil: 'domcontentloaded',
      timeout: 20000,
    });
    await page.waitForTimeout(3000);

    const currentUrl = page.url();
    if (currentUrl.includes('/nlogin/login')) {
      return { valid: false };
    }
    return { valid: true };
  } catch {
    return { valid: false };
  }
}

/**
 * Submit OTP on the existing Naukri login page.
 *
 * The OTP is supplied by the authenticated user and is never logged.
 */
export async function submitNaukriOtp(
  page: Page,
  otp: string,
): Promise<NaukriLoginResult> {
  try {
    logger.log('Submitting Naukri OTP...');

    logger.log(`OTP verification URL: ${page.url()}`);

    const bodyText = await page
      .locator('body')
      .innerText()
      .catch(() => '');

    logger.log(
      `OTP verification page text: ${bodyText.substring(0, 1500)}`,
    );

    const allInputs = await page.locator('input').evaluateAll((els) =>
      els.map((el: any) => ({
        type: el.type,
        id: el.id,
        name: el.name,
        placeholder: el.placeholder,
        autocomplete: el.autocomplete,
        inputmode: el.inputMode,
      })),
    );

    logger.log(
      `OTP verification inputs: ${JSON.stringify(allInputs)}`,
    );

    const cleanOtp = otp.replace(/\D/g, '');

    if (!cleanOtp || cleanOtp.length < 4 || cleanOtp.length > 8) {
      return {
        success: false,
        error: 'OTP 4 se 8 digits ka hona chahiye.',
      };
    }

    const currentUrlBeforeOtp = page.url();

    logger.log(
      `OTP verification page URL: ${currentUrlBeforeOtp}`,
    );

    const otpSelectors = [
      'input[type="tel"]',
      'input[id^="Input_"]',
      'input[autocomplete="one-time-code"]',
      'input[inputmode="numeric"]',
    ];

    let otpFields: any[] = [];
    let selectedOtpSelector = '';

    for (const selector of otpSelectors) {
      try {
        const locator = page.locator(selector);
        const count = await locator.count();

        logger.log(
          `OTP selector "${selector}" found ${count} element(s)`,
        );

        if (count === 0) {
          continue;
        }

        const visibleFields: any[] = [];

        for (let i = 0; i < count; i++) {
          const field = locator.nth(i);

          if (await field.isVisible().catch(() => false)) {
            visibleFields.push(field);
          }
        }

        if (visibleFields.length > 0) {
          otpFields = visibleFields;
          selectedOtpSelector = selector;

          logger.log(
            `Using OTP selector "${selector}" with ${visibleFields.length} visible field(s)`,
          );

          break;
        }
      } catch (error: any) {
        logger.error(
          `OTP selector "${selector}" failed: ${
            error?.message || error
          }`,
        );
      }
    }

    if (otpFields.length === 0) {
      const currentUrl = page.url();

      const bodyText = await page
        .locator('body')
        .innerText()
        .catch((error: any) => {
          logger.error(
            `Could not read OTP page body: ${
              error?.message || error
            }`,
          );
          return '';
        });

      const allInputs = await page
        .locator('input')
        .evaluateAll((els) =>
          els.map((el: any) => ({
            type: el.type || '',
            id: el.id || '',
            name: el.name || '',
            placeholder: el.placeholder || '',
            autocomplete: el.autocomplete || '',
            inputmode: el.inputMode || '',
          })),
        )
        .catch((error: any) => {
          logger.error(
            `Could not inspect OTP inputs: ${
              error?.message || error
            }`,
          );
          return [];
        });

      logger.error(
        `OTP field not found. URL=${currentUrl}`,
      );

      logger.error(
        `OTP inputs on page: ${JSON.stringify(allInputs)}`,
      );

      logger.error(
        `OTP page text preview: ${bodyText
          .replace(/\s+/g, ' ')
          .slice(0, 1200)}`,
      );

      return {
        success: false,
        error:
          'Naukri OTP field verify ke waqt available nahi hai. Browser session ya OTP page change ho gaya ho sakta hai.',
      };
    }

    if (otpFields.length < cleanOtp.length) {
      return {
        success: false,
        error:
          `Naukri OTP fields incomplete hain. ${cleanOtp.length} digits required, ${otpFields.length} fields mile.`,
      };
    }

    logger.log(
      `Preparing to enter OTP into ${otpFields.length} field(s) using "${selectedOtpSelector}"`,
    );

    for (let i = 0; i < cleanOtp.length; i++) {
      const field = otpFields[i];

      await field.waitFor({
        state: 'visible',
        timeout: 5000,
      });

      await field.fill(cleanOtp[i]);

      logger.log(
        `OTP field ${i + 1}/${cleanOtp.length} filled`,
      );
    }

    const verifyCandidates = [
      page.getByRole('button', {
        name: /^Verify$/i,
      }),
      page.locator('button:has-text("Verify")'),
      page.locator('button[type="submit"]'),
    ];

    let verifyButton: any = null;

    for (const candidate of verifyCandidates) {
      const count = await candidate.count().catch(() => 0);

      for (let i = 0; i < count; i++) {
        const button = candidate.nth(i);

        if (!(await button.isVisible().catch(() => false))) {
          continue;
        }

        const text = (
          await button.innerText().catch(() => '')
        ).trim();

        if (/^verify$/i.test(text) || !text) {
          verifyButton = button;
          break;
        }
      }

      if (verifyButton) {
        break;
      }
    }

    if (!verifyButton) {
      return {
        success: false,
        error: 'Naukri Verify button nahi mila.',
      };
    }

    logger.log(
      'Naukri Verify button found. Clicking...',
    );

    await verifyButton.click();

    logger.log(
      'OTP submitted. Waiting for Naukri response...',
    );

    await page.waitForTimeout(5000);

    const currentUrl = page.url();

    const title = await page
      .title()
      .catch(() => '');

    logger.log(
      `OTP verification response URL: ${currentUrl}`,
    );

    logger.log(
      `OTP verification response title: ${title}`,
    );

    const visibleText = await page
      .locator('body')
      .innerText()
      .catch(() => '');

    const normalizedText = visibleText
      .replace(/\s+/g, ' ')
      .trim();

    logger.log(
      `OTP response text preview: ${normalizedText.slice(
        0,
        1200,
      )}`,
    );

    if (
      currentUrl.includes('/nlogin/login') &&
      /enter the otp|verify otp/i.test(normalizedText)
    ) {
      return {
        success: false,
        error:
          'OTP verify nahi hua. Naukri login/OTP page par hi hai.',
      };
    }

    const cookies = await page.context().cookies();

    logger.log(
      `OTP verification successful. Cookies received: ${cookies.length}`,
    );

    if (!cookies.length) {
      return {
        success: false,
        error:
          'OTP verify hua, lekin authenticated session cookies nahi mili.',
      };
    }

    return {
      success: true,
      cookies,
    };
  } catch (error: any) {
    logger.error(
      `Naukri OTP submission failed: ${
        error?.message || error
      }`,
    );

    return {
      success: false,
      error:
        error?.message ||
        'OTP verification ke dauran unexpected error aaya.',
    };
  }
}

