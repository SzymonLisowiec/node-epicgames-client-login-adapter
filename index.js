const Puppeteer = require('puppeteer');
const ExchangeCodeException = require('./exceptions/ExchangeCodeException');

class EpicGamesClientLoginAdapter {

  constructor (browser) {
    this.browser = browser;
  }

  close () {
    return this.browser.close();
  }

  async getExchangeCode () {
    try {
      const page = await this.browser.pages().then(pages => pages[0]);
      const response = await page.goto('https://www.epicgames.com/id/api/exchange').then(response => response.json());
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

  static async init (credentials={}, userOptions={}) {
    const options = {
      language: 'en-US',
      width: 500,
      height: 800,
      inputDelay: 100,
      enterCredentialsTimeout: 60000,
      puppeteer: {},
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
      ],
      ...options.puppeteer,
    });
    const page = await browser.pages().then(pages => pages[0]);
    await page.goto('https://epicgames.com/id');
    const login = credentials.login || credentials.email || credentials.username;
    if (login && credentials.password) {
      const usernameOrEmailField = await page.waitForSelector('#usernameOrEmail');
      await usernameOrEmailField.type(login, { delay: options.inputDelay });
      const passwordField = await page.waitForSelector('#password');
      await passwordField.type(credentials.password, { delay: options.inputDelay });
      const loginButton = await page.waitForSelector('#login:not(:disabled)');
      await loginButton.click();
    }
    await page.waitForRequest(request => request.url() === 'https://www.epicgames.com/account/personal' && request.method() === 'GET', {
      timeout: options.enterCredentialsTimeout,
    });
    return new this(browser);
  }

}

module.exports = EpicGamesClientLoginAdapter;
