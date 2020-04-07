# `epicgames-client` login adapter
[![npm version](https://img.shields.io/npm/v/epicgames-client-login-adapter.svg)](https://npmjs.com/package/epicgames-client-login-adapter)
[![npm downloads](https://img.shields.io/npm/dm/epicgames-client-login-adapter.svg)](https://npmjs.com/package/epicgames-client-login-adapter)
[![license](https://img.shields.io/npm/l/epicgames-client-login-adapter.svg)](https://github.com/SzymonLisowiec/node-epicgames-client-login-adapter/blob/master/LICENSE.MD)
[![paypal](https://img.shields.io/badge/paypal-donate-orange.svg)](https://www.paypal.com/cgi-bin/webscr?cmd=_donations&business=szymonlisowiec%40gmail.com&currency_code=USD&source=url)

Helper for epicgames-client library, to easy login.

# Installation
```
npm i epicgames-client-login-adapter --save
```

# Example
```javascript
const { Launcher } = require('epicgames-client');

(async () => {

  const launcher = new Launcher();

  if(!await launcher.init()) {
    throw new Error('Error while initialize process.');
  }
  
  const clientLoginAdapter = await ClientLoginAdapter.init({
    login: 'E-MAIL_OR_USERNAME',
    password: 'PASSWORD',
  });
  const exchangeCode = await clientLoginAdapter.getExchangeCode();
  await clientLoginAdapter.close();
  
  await launcher.login(null, exchangeCode);
  
  const playerName = 'Kysune';
  const account = await launcher.getProfile(playerName);
  if(!account) throw new Error(`Player ${playerName} not found!`);
	
  console.log(`${account.name}'s id: ${account.id}`);
  // "Kysune's id: 9a1d43b1d826420e9fa393a79b74b2ff"

})();
```

# Reference

## static init([credentials, options])
- **credentials** [optional]
  - **login**
  - **password**
- **options** [optional]
  - **language** (default `en-US`) - browser's language
  - **width** (default `500`) - browser's window width
  - **height** (default `800`) - browser's window height
  - **inputDelay** (default `100` ms) - if you give `credentials`, browser will type your login and password in fields automatic. This time is delay to type next letter in field.
  - **enterCredentialsTimeout** (default `60000` ms) - time for waiting for user input credentials, can be helpful while you do not give `credentials` and user have to do it manually.
  - **puppeteer** - puppeteer launch options. You can read more [here](https://pptr.dev/#?product=Puppeteer&version=v2.1.1&show=api-puppeteerlaunchoptions).

Returns `EpicGamesClientLoginAdapter` instance.

## getExchangeCode()
Returns exchange code.

# Do you need help?
Check our discord server: https://discord.gg/HxGfuEx

# License
MIT License

Copyright (c) 2020 Szymon Lisowiec

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
