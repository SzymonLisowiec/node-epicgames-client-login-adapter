const Puppeteer = require('puppeteer');
const { TimeoutError } = require('puppeteer/lib/Errors');
const { PendingXHR } = require('pending-xhr-puppeteer');
const { ElementHandle } = require('puppeteer/lib/JSHandle');
const ExchangeCodeException = require('./exceptions/ExchangeCodeException');

class EpicGamesClientLoginAdapter {

  static get ACCOUNT_PAGE() {
    return 'https://www.epicgames.com/account/personal';
  }

  constructor (browser) {
    this.browser = browser;
  }

  close () {
    return this.browser.close();
  }

  async getPage() {
    return await this.browser.pages().then(pages => pages[0]);
  }

  async getExchangeCode () {
    try {
      const page = await this.getPage();

      const oldXsrfToken = (await page.cookies()).find((c) => c.name === 'XSRF-TOKEN');
      if (oldXsrfToken) {
        page.once('request', (req) => {
          req.continue({
            method: 'GET',
            headers: {
              ...req.headers,
              'X-XSRF-TOKEN': oldXsrfToken.value,
            },
          });
        });
      }
      await page.setRequestInterception(Boolean(oldXsrfToken));
      await page.goto('https://www.epicgames.com/id/api/authenticate');
      await page.setRequestInterception(false);

      if (oldXsrfToken) {
        page.once('request', (req) => {
          req.continue({
            method: 'GET',
            headers: {
              ...req.headers,
              'X-XSRF-TOKEN': oldXsrfToken.value,
            },
          });
        });
      }
      await page.setRequestInterception(Boolean(oldXsrfToken));
        try {
          await page.goto('https://www.epicgames.com/id/api/csrf');
        } catch (e) {}
      await page.setRequestInterception(false);


      const xsrfToken = (await page.cookies()).find((c) => c.name === 'XSRF-TOKEN').value;
      page.once('request', (req) => {
        req.continue({
          method: 'POST',
          headers: {
            ...req.headers,
            'X-XSRF-TOKEN': xsrfToken,
          },
        });
      });
      await page.setRequestInterception(true);
      const response = await (await page.goto('https://www.epicgames.com/id/api/exchange/generate')).json();
      await page.setRequestInterception(false);


      if (!response.code) {
        throw new ExchangeCodeException(`Unexcepted response: ${JSON.stringify(response)}`);
      }
      return response.code;
    } catch (error) {
      if (error instanceof ExchangeCodeException) {
        throw error;
      }
      throw new ExchangeCodeException(`Exchange code cannot be obtained (${error.toString()})`);
    }
  }

  static async waitForFirst(waiters, timeout, url) {
    let errorFunction = () => { throw new ExchangeCodeException(`Something went wrong! Current page is ${url}. Details: ${result}`); };
    let errorTimeout = setTimeout(errorFunction, timeout);

    let result = await Promise.race(waiters).catch((error) => {
      if (error instanceof TimeoutError) {
        return error;
      } else {
        throw error;
      }
    });

    clearTimeout(errorTimeout);
    if (result instanceof TimeoutError) {
      errorFunction(result);
    }

    return result;
  }

  static async authenticate(credentials, page, options) {
    const login = credentials.login || credentials.email || credentials.username;
    if (login && credentials.password) {
      const loginWithEpicButton = await page.waitForSelector('#login-with-epic');
      await loginWithEpicButton.click();
      const usernameOrEmailField = await page.waitForSelector('#email');
      await usernameOrEmailField.type(login, { delay: options.inputDelay });
      const passwordField = await page.waitForSelector('#password');
      await passwordField.type(credentials.password, { delay: options.inputDelay });
      const loginButton = await page.waitForSelector('#sign-in:not(:disabled)');
      await loginButton.click();
    }

    let account = page.waitForResponse(this.ACCOUNT_PAGE, {
      timeout: options.enterCredentialsTimeout + 100,
    });

    let captcha = page.waitForXPath('//iframe[@title="arkose-enforcement"]', {
      timeout: options.enterCredentialsTimeout + 100
    });

    let result = await this.waitForFirst([captcha, account], options.enterCredentialsTimeout, page.url());
    if (result instanceof ElementHandle) {
      await this.handleCaptcha(await result.contentFrame(), page, options);
    }
  }

  static async handleCaptcha(enforcementFrame, page, options) {
    let frame = await (await enforcementFrame.waitForXPath('//iframe[@title="challenge frame"]')).contentFrame();
    frame = await (await frame.waitForSelector('iframe')).contentFrame();
    frame = await (await frame.waitForSelector('#CaptchaFrame')).contentFrame();

    let timeout = 10000;
    let button = frame.waitForSelector('#home_children_button', { visible: true }, { timeout: timeout + 100 });
    let canvas = frame.waitForSelector('canvas', { visible: true }, { timeout: timeout + 100 });

    let clickDelay = options.inputDelay + 20 * Math.random();
    let element = await this.waitForFirst([button, canvas], timeout, frame.url());
    if ((await element.evaluate(node => node.tagName)).toLowerCase() == 'canvas') {
      const captchaBoundingBox = await element.boundingBox();

      // Click on "Verify" button
      await page.mouse.click(
        captchaBoundingBox.x + captchaBoundingBox.width / 2.1 + 15 * Math.random(),
        captchaBoundingBox.y + captchaBoundingBox.height * 3.2/4 + 15 * Math.random(),
        { delay: clickDelay }
      );
    } else {
      await element.click({ delay: clickDelay });
    }

    await page.waitForResponse(this.ACCOUNT_PAGE, { timeout: options.enterCredentialsTimeout });
  }

  static async init (credentials={}, userOptions={}) {
    const options = {
      language: 'en-US',
      width: 500,
      height: 800,
      inputDelay: 100,
      enterCredentialsTimeout: 60000,
      puppeteer: {},
      cookies: [],
      ...userOptions,
    };
    const browser = await Puppeteer.launch({
      headless: false,
      defaultViewport: {
        width: options.width,
        height: options.height,
      },
      args: [
        `--window-size=${options.width},${options.height}`,
        `--lang=${options.language}`,
        '--disable-features=site-per-process'
      ],
      ...options.puppeteer,
    });

    const page = await browser.pages().then(pages => pages[0]);
    if (options.cookies && options.cookies.length) {
      await page.setCookie(...options.cookies);
    }

    const pendingXHR = new PendingXHR(page);
    const pendingDocument = new PendingXHR(page);
    pendingDocument.resourceType = 'document';
    await page.goto('https://epicgames.com/id');
    await page.waitFor(1000);
    await pendingXHR.waitOnceForAllXhrFinished();
    await page.waitFor(1000);
    await pendingDocument.waitOnceForAllXhrFinished();

    if (page.url() != this.ACCOUNT_PAGE) {
      await this.authenticate(credentials, page, options);
    }

    return new this(browser);
  }

}

module.exports = EpicGamesClientLoginAdapter;
