'use strict';

// Siseveebi sisselogimise abifunktsioonid.
// NB! Tunnuseid ei tohi koodi kirjutada – need tulevad .env failist või
// keskkonnamuutujatest (vt tests/support/env.js).
const { expect } = require('@playwright/test');
const { getCredentials } = require('./env');

const KONTO_ORIGIN = 'https://konto.siseveeb.voco.ee';
const LOGIN_URL = `${KONTO_ORIGIN}/?redirect_uri=https://opilane.siseveeb.voco.ee/`;

const SELECTORS = {
  username: 'Kasutajatunnus',
  password: 'Parool',
  submit: 'Sisene',
  snackbar: '.v-snackbar',
};

function isKontoUrl(url) {
  return String(url).startsWith(KONTO_ORIGIN);
}

/**
 * Logib sisse konto.siseveeb.voco.ee vormi kaudu ja ootab ümbersuunamist
 * opilane.siseveeb.voco.ee keskkonda.
 *
 * @param {import('@playwright/test').Page} page
 * @param {{username: string, password: string}} [creds]
 * @returns {Promise<import('@playwright/test').Page>}
 */
async function loginViaUI(page, creds = getCredentials()) {
  if (!creds.username || !creds.password) {
    throw new Error(
      'Siseveebi kasutajatunnus/parool puudub. Kopeeri .env.example -> .env ja täida SISEVEEB_USER ning SISEVEEB_PASS.',
    );
  }

  await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded' });

  // Vorm on Vuetify 3 komponentidel põhinev SPA – ootame, kuni väljad on nähtavad.
  await expect(page.getByLabel(SELECTORS.username, { exact: true })).toBeVisible({ timeout: 30_000 });
  await page.getByLabel(SELECTORS.username, { exact: true }).fill(creds.username);
  await page.getByLabel(SELECTORS.password, { exact: true }).fill(creds.password);

  await page.getByRole('button', { name: SELECTORS.submit, exact: true }).click();

  // Esimene päring võib saada CSRF-vea (400) ja rakendus kordab selle ise.
  // Õnnestumise tunnus on see, et URL lahkub konto.* domeenilt.
  try {
    await page.waitForURL((url) => !isKontoUrl(url) || url.pathname.includes('opilane'), {
      timeout: 60_000,
      waitUntil: 'domcontentloaded',
    });
  } catch (error) {
    const message = await page
      .locator(SELECTORS.snackbar)
      .first()
      .innerText()
      .catch(() => '');
    throw new Error(
      `Sisselogimine ei õnnestunud (URL: ${page.url()}).` +
        (message ? ` Veateade lehel: "${message.trim()}"` : ' Veateadet ei kuvatud.'),
    );
  }

  await expect(page).not.toHaveURL(/konto\.siseveeb\.voco\.ee/);
  return page;
}

module.exports = { LOGIN_URL, KONTO_ORIGIN, SELECTORS, loginViaUI, isKontoUrl };
