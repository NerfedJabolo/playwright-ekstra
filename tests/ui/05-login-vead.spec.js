'use strict';

// Ülesanne 5: vale parooliga sisselogimise test.
// Kontrollime, et kuvatakse õiged veateated ja et kasutaja ei logita sisse.
//
// See test ei vaja .env faili – kasutame tahtlikult väljamõeldud kasutajat,
// et päris kontot mitte lukustada.
const { baseTest: test, expect } = require('../support/fixtures');
const { LOGIN_URL, KONTO_ORIGIN } = require('../support/auth');
const { screenshot } = require('../support/artifacts');

const VALED_TUNNUSED = [
  { kirjeldus: 'väljamõeldud kasutajatunnus', kasutaja: 'test.kasutaja.123', parool: 'ValeParool123!' },
  { kirjeldus: 'isikukoodi kujuline tunnus', kasutaja: '39901011234', parool: 'x' },
];

const KONTO_REGEXP = new RegExp(`^${KONTO_ORIGIN.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`);

async function sisene(page, { kasutaja, parool }) {
  await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded' });
  await expect(page.getByLabel('Kasutajatunnus', { exact: true })).toBeVisible();
  await page.getByLabel('Kasutajatunnus', { exact: true }).fill(kasutaja);
  await page.getByLabel('Parool', { exact: true }).fill(parool);
  await page.getByRole('button', { name: 'Sisene', exact: true }).click();
}

test.describe('Sisselogimine – negatiivsed stsenaariumid', () => {
  test('TC-05a: vale parool kuvab veateate "Sisselogimine ebaõnnestus"', async ({ page }, testInfo) => {
    await sisene(page, VALED_TUNNUSED[0]);

    // Vuetify snackbar on role="status" ja aria-live="polite" – ekraanilugeja
    // jaoks on see õige koht veateate kuvamiseks.
    const teade = page.getByRole('status').filter({ hasText: 'Sisselogimine ebaõnnestus' });
    await expect(teade).toBeVisible({ timeout: 20_000 });
    await expect(teade).toContainText('Sisselogimine ebaõnnestus');

    // Kasutaja jääb sisselogimislehele, edasi ei suunata.
    await expect(page).toHaveURL(KONTO_REGEXP);
    await expect(page.getByRole('button', { name: 'Sisene', exact: true })).toBeVisible();

    // Ebaõnnestunud katse ei tohi tekitada siseveebi sessiooniküpsist.
    const cookies = await page.context().cookies();
    expect(cookies.filter((cookie) => cookie.name.startsWith('siseveeb'))).toHaveLength(0);

    await screenshot(page, 'tc05a-vale-parool', testInfo);
  });

  test('TC-05b: tühjade väljadega saatmine kuvab vormivea "Vormi sisestuse viga"', async ({ page }, testInfo) => {
    await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'Sisene', exact: true }).click();

    const teade = page.getByRole('status').filter({ hasText: 'Vormi sisestuse viga' });
    await expect(teade).toBeVisible({ timeout: 20_000 });

    // Vorm jääb täidetavaks – kasutaja saab kohe uuesti proovida.
    await expect(page.getByLabel('Kasutajatunnus', { exact: true })).toBeEditable();
    await expect(page.getByLabel('Parool', { exact: true })).toBeEditable();

    await screenshot(page, 'tc05b-tuhjad-valjad', testInfo);
  });

  test('TC-05c: veateade ei reeda, kas kasutaja on olemas, ja korduskatse annab sama vea', async ({
    page,
    browser,
  }, testInfo) => {
    const teated = [];

    // 1. katse eraldi kontekstis (isikukoodi kujuline tunnus).
    const kontekst = await browser.newContext();
    try {
      const leht = await kontekst.newPage();
      await sisene(leht, VALED_TUNNUSED[1]);
      const teade = leht.getByRole('status').filter({ hasText: 'Sisselogimine ebaõnnestus' });
      await expect(teade).toBeVisible({ timeout: 20_000 });
      teated.push((await teade.innerText()).trim());
    } finally {
      await kontekst.close();
    }

    // 2. katse testi enda lehel – jääb ka ekraanipildile.
    await sisene(page, VALED_TUNNUSED[0]);
    const teade = page.getByRole('status').filter({ hasText: 'Sisselogimine ebaõnnestus' });
    await expect(teade).toBeVisible({ timeout: 20_000 });
    teated.push((await teade.innerText()).trim());
    await screenshot(page, 'tc05c-korduv-katse', testInfo);

    // Sama üldine veateade mõlemal juhul: ründaja ei saa teada, kas kasutaja on olemas.
    expect(teated).toHaveLength(2);
    expect(teated[0]).toBe(teated[1]);
    expect(teated[0]).toContain('Sisselogimine ebaõnnestus');
  });
});
