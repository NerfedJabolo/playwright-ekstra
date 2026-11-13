'use strict';

// Ülesanne 2: leia siseveebist õpetaja tunniplaan ja tee pilt.
// Proovi ka test.each() loogikat mitme õpetaja peale:
// Aly Valvas, Maret Vaabel, Max Frolov.
//
// NB! Playwright Testil ei ole Jest'i `test.each()` meetodit. Playwrighti
// ametlik viis on sama: genereerida iga andmerea jaoks eraldi test tsükliga
// (vt https://playwright.dev/docs/test-parameterize). Iga nimi saab eraldi
// testi, eraldi tulemuse ja eraldi ekraanipildi – täpselt nagu test.each().
const fs = require('fs');
const path = require('path');
const { test, expect } = require('../support/fixtures');
const { hasCredentials, env } = require('../support/env');
const { screenshot } = require('../support/artifacts');

test.skip(
  !hasCredentials(),
  'Siseveebi tunnused puuduvad – kopeeri .env.example failiks .env ja täida SISEVEEB_USER / SISEVEEB_PASS',
);

const ÕPETAJATE_LEHT = 'https://siseveeb.voco.ee/kutseope/oppetoo/tunniplaan';
const DIAGNOSTIKA_DIR = path.join(__dirname, '..', '..', 'docs', 'diagnostika');

// test.each() ekvivalent: iga õpetaja -> eraldi test.
const ÕPETAJAD = env('SISEVEEB_OPETAJAD', 'Aly Valvas,Maret Vaabel,Max Frolov')
  .split(',')
  .map((nimi) => nimi.trim())
  .filter(Boolean);

function failiNimi(nimi) {
  return nimi
    .toLowerCase()
    .replace(/[äöüõšž]/g, (täht) => ({ ä: 'a', ö: 'o', ü: 'u', õ: 'o', š: 's', ž: 'z' })[täht])
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Salvestab lehe HTML-i ja ekraanipildi, et ebaõnnestumist oleks lihtne uurida. */
async function diagnostika(page, testInfo, nimi) {
  fs.mkdirSync(DIAGNOSTIKA_DIR, { recursive: true });
  const htmlFail = path.join(DIAGNOSTIKA_DIR, `${nimi}.html`);
  fs.writeFileSync(htmlFail, await page.content(), 'utf8');
  await testInfo.attach(`${nimi}.html`, { path: htmlFail, contentType: 'text/html' });
  await screenshot(page, `${nimi}-diagnostika`, testInfo);
}

/**
 * Valib õpetaja tunniplaani lehel. Siseveebi vanem õppetöö vaade võib pakkuda
 * õpetajat lingina, otsinguväljana või rippmenüüna – proovime kõiki viise
 * kindlas järjekorras ja logime, milline õnnestus.
 */
async function valiÕpetaja(page, nimi) {
  // 1) Õpetaja nimi on lingina (nt õpetajate nimekiri).
  const link = page.getByRole('link', { name: nimi, exact: false }).first();
  if ((await link.count()) && (await link.isVisible().catch(() => false))) {
    await link.click();
    return 'link';
  }

  // 2) Otsinguväli / tekstiväli, mille vihje viitab õpetajale või otsingule.
  const väljad = page.locator('input[type="text"], input[type="search"], input:not([type])');
  for (let i = 0; i < (await väljad.count()); i += 1) {
    const väli = väljad.nth(i);
    if (!(await väli.isVisible().catch(() => false))) continue;
    const vihje = [
      (await väli.getAttribute('placeholder')) || '',
      (await väli.getAttribute('name')) || '',
      (await väli.getAttribute('id')) || '',
      (await väli.getAttribute('aria-label')) || '',
    ]
      .join(' ')
      .toLowerCase();
    if (!/õpet|opet|teacher|otsi|search|nimi/.test(vihje)) continue;

    await väli.fill(nimi);
    await väli.press('Enter');
    await page.waitForTimeout(1500); // otsing on serveripoolne
    return 'otsing';
  }

  // 3) Rippmenüü (select) õpetaja nimedega.
  const valikud = page.locator('select');
  for (let i = 0; i < (await valikud.count()); i += 1) {
    const valik = valikud.nth(i);
    if (!(await valik.isVisible().catch(() => false))) continue;
    const suvandid = await valik.locator('option').allInnerTexts();
    const sobiv = suvandid.find((s) => s.trim() === nimi) || suvandid.find((s) => s.includes(nimi));
    if (sobiv) {
      await valik.selectOption({ label: sobiv });
      return 'select';
    }
  }

  // 4) Vuetify combobox (role=combobox) – klõpsa ja vali nimekirjast.
  const combod = page.getByRole('combobox');
  for (let i = 0; i < (await combod.count()); i += 1) {
    const combo = combod.nth(i);
    if (!(await combo.isVisible().catch(() => false))) continue;
    await combo.click();
    const valik = page.getByRole('option', { name: nimi, exact: false }).first();
    if (await valik.isVisible().catch(() => false)) {
      await valik.click();
      return 'combobox';
    }
    await page.keyboard.press('Escape');
  }

  return null;
}

test.describe('Ülesanne 2 – õpetajate tunniplaanid', () => {
  for (const õpetaja of ÕPETAJAD) {
    test(`TC-02 Õpetaja tunniplaan: ${õpetaja}`, async ({ page }, testInfo) => {
      const silt = failiNimi(õpetaja);

      await page.goto(ÕPETAJATE_LEHT, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle').catch(() => {});

      // Sessioon peab kehtima – muidu suunatakse konto.siseveeb.voco.ee lehele.
      expect(
        page.url(),
        'Sessioon puudub või õppetöö vaade nõuab teistsugust õigust – kontrolli .env tunnuseid',
      ).not.toMatch(/konto\.siseveeb\.voco\.ee/);

      const viis = await valiÕpetaja(page, õpetaja);
      if (!viis) {
        await diagnostika(page, testInfo, `tc02-${silt}-valimine-ebaonnestus`);
      }
      expect(viis, `Õpetaja "${õpetaja}" valimiseks ei leitud sobivat juhtelementi`).not.toBeNull();
      testInfo.annotations.push({ type: 'valimise_viis', description: viis });

      // Tunniplaan: kas tabel, FullCalendar või nädalaplaan. Ootame, kuni sisu tuleb.
      const sisu = page.locator('table, .fc, .tunniplaan, [class*="tunniplaan" i]').first();
      await expect(sisu).toBeVisible({ timeout: 30_000 });

      // Õpetaja nimi peab lehel näha olema – see tõestab, et vaade on õige õpetaja oma.
      await expect(page.getByText(õpetaja, { exact: false }).first()).toBeVisible({ timeout: 30_000 });

      const pilt = await screenshot(page, `tc02-opetaja-${silt}`, testInfo);
      testInfo.annotations.push({ type: 'ekraanipilt', description: pilt });
    });
  }
});
