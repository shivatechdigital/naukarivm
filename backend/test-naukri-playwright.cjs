const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  let browser;

  try {
    console.log('Starting Chromium...');

    browser = await chromium.launch({
      headless: true,
    });

    const page = await browser.newPage();

    page.on('response', response => {
      if (response.url().includes('naukri.com')) {
        console.log('RESPONSE:', response.status(), response.url());
      }
    });

    page.on('requestfailed', request => {
      if (request.url().includes('naukri.com')) {
        console.log(
          'REQUEST FAILED:',
          request.url(),
          request.failure()
        );
      }
    });

    console.log('Opening Naukri login...');

    const response = await page.goto(
      'https://www.naukri.com/nlogin/login',
      {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      }
    );

    console.log(
      'MAIN STATUS:',
      response ? response.status() : 'NO RESPONSE'
    );

    console.log('URL:', await page.url());
    console.log('TITLE:', await page.title());

    await page.waitForTimeout(3000);

    const html = await page.content();

    fs.writeFileSync(
      '/tmp/naukri-playwright.html',
      html
    );

    await page.screenshot({
      path: '/tmp/naukri-playwright.png',
      fullPage: true,
    });

    console.log('HTML SIZE:', html.length);

    console.log(
      'EMAIL INPUTS:',
      await page.locator('input').evaluateAll(inputs =>
        inputs.map(input => ({
          id: input.id,
          name: input.getAttribute('name'),
          type: input.type,
          placeholder: input.getAttribute('placeholder'),
        }))
      )
    );

    console.log(
      'PAGE TEXT:',
      (await page.locator('body').innerText()).slice(0, 1000)
    );

    console.log('Screenshot: /tmp/naukri-playwright.png');
    console.log('HTML: /tmp/naukri-playwright.html');

  } catch (error) {
    console.error('TEST ERROR:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
})();
