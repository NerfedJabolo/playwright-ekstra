'use strict';

// Ülesanne 1: mine siseveebi, logi sisse, ava tunniplaan, leia enda tunniplaan, tee pilt.
//
// Sisselogimine toimub tests/support/fixtures.js kaudu (authSession): üks
// sisselogimine worker'i kohta, seejärel kopeeritakse küpsised igasse testi.
const { test, expect } = require('../support/fixtures');
const { hasCredentials } = require('../support/env');
const { screenshot } = require('../support/artifacts');
const { measurePageLoad } = require('../support/perf');

test.skip(
  !hasCredentials(),
  'Siseveebi tunnused puuduvad – kopeeri .env.example failiks .env ja täida SISEVEEB_USER / SISEVEEB_PASS',
);

test.describe('Ülesanne 1 – õpilase tunniplaan', () => {
  test('TC-01 Õpilase tunniplaan avaneb ja kuvab nädalakalendri', async ({ page }, testInfo) => {
    // Tunniplaan on FullCalendar'il põhinev vaade (.fc) ja nädala valik on
    // Vuetify select ("Vali nädal"). Mõõdame ka laadimisaja (ülesanne 4).
    const mõõt = await measurePageLoad(page, {
      url: '/tunniplaan',
      ready: page.locator('.fc').first(),
      label: 'opilane/tunniplaan',
    });
    testInfo.annotations.push({ type: 'laadimisaeg', description: `tunniplaan valmis ${mõõt.wall.readyMs} ms` });

    // 1) Õige leht ja sisselogitud sessioon (ei ole tagasi suunatud konto-lehele).
    await expect(page).toHaveURL(/opilane\.siseveeb\.voco\.ee\/tunniplaan/);
    await expect(page.getByLabel('Parool', { exact: true })).toHaveCount(0);

    // 2) Tunniplaan on nähtav. Kui tunniplaan pole avalik, kuvab süsteem
    //    hoiatuse "Tunniplaan on alles loomisel".
    const kalender = page.locator('.fc').first();
    const hoiatus = page.getByText('Tunniplaan on alles loomisel', { exact: false }).first();
    await expect(kalender.or(hoiatus)).toBeVisible({ timeout: 30_000 });

    // 3) Nädala valik (Vuetify select) on olemas.
    const nädalaValik = page.getByRole('combobox', { name: /Vali nädal/i }).first();
    await expect.soft(nädalaValik).toBeVisible();

    // 4) Valime teadlikult käesoleva nädala, et pilt näitaks "enda tunniplaani".
    if (await nädalaValik.isVisible().catch(() => false)) {
      await nädalaValik.click();
      const käesolevNädal = page.getByRole('option', { name: /Käesoleva nädala tunniplaan/i }).first();
      if (await käesolevNädal.isVisible().catch(() => false)) {
        await käesolevNädal.click();
      } else {
        await page.keyboard.press('Escape');
      }
    }

    // 5)Tunnid on FullCalendar'i sündmused. Arv läheb aruandesse, aga ei ole
    //    kõva nõue (õpilasel võib nädal olla tundideta, nt vaheajal).
    const tunde = await page.locator('.fc-event').count();
    testInfo.annotations.push({ type: 'tunde_nadalas', description: String(tunde) });
    expect.soft(tunde, 'Käesoleval nädalal peaks vähemalt üks tund olema').toBeGreaterThan(0);

    // 6) Ekraanipilt (täisleht) docs/screenshots/ kausta.
    const pilt = await screenshot(page, 'tc01-opilase-tunniplaan', testInfo);
    testInfo.annotations.push({ type: 'ekraanipilt', description: pilt });
  });
});
