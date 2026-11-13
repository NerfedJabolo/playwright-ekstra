'use strict';

// Testide ühised fixtuurid.
//
// Siseveebi sessioon luuakse üks kord worker'i kohta (authSession) ja
// kopeeritakse igasse testikonteksti. Nii ei logita iga testi alguses uuesti
// sisse, aga iga test saab siiski puhta brauserikonteksti.
const base = require('@playwright/test');
const { getCredentials, hasCredentials } = require('./env');
const { loginViaUI } = require('./auth');

const test = base.test;
const expect = base.expect;

const authedTest = test.extend({
  // Worker'i ulatuses üks sisselogimine -> storageState (küpsised + localStorage).
  authSession: [
    async ({ browser }, use) => {
      if (!hasCredentials()) {
        throw new Error(
          'Siseveebi tunnused puuduvad. Kopeeri .env.example failiks .env ja täida SISEVEEB_USER ning SISEVEEB_PASS.',
        );
      }
      const context = await browser.newContext({
        locale: 'et-EE',
        timezoneId: 'Europe/Tallinn',
      });
      const page = await context.newPage();
      await loginViaUI(page, getCredentials());
      const state = await context.storageState();
      await context.close();
      await use(state);
    },
    { scope: 'worker' },
  ],

  // Enne iga testi kopeerime sessiooniküpsised värskesse konteksti.
  page: async ({ page, authSession }, use) => {
    await page.context().addCookies(authSession.cookies || []);

    const origins = (authSession.origins || []).filter((origin) => origin.localStorage?.length);
    if (origins.length) {
      await page.addInitScript((entries) => {
        try {
          for (const { origin, localStorage: items } of entries) {
            if (window.location.origin !== origin) continue;
            for (const { name, value } of items) window.localStorage.setItem(name, value);
          }
        } catch {
          /* about:blank jt – vaikselt vahele */
        }
      }, origins);
    }

    await use(page);
  },
});

module.exports = { test: authedTest, baseTest: test, expect };
