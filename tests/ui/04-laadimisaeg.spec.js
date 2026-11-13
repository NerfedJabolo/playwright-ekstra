'use strict';

// Ülesanne 4: mõõda lehe laadimisaega.
//
// Playwrightil puudub `page.metrics()` (see on Puppeteer). Kasutame:
//   * performance.now() + Navigation Timing API (page.evaluate sees),
//   * CDP Performance.getMetrics (ScriptDuration, TaskDuration, JS heap).
// Mõõtmised salvestatakse docs/perf-tulemused.json faili ja manustatakse aruandesse.
const { baseTest, test, expect } = require('../support/fixtures');
const { hasCredentials } = require('../support/env');
const { measurePageLoad } = require('../support/perf');
const { savePerfRecord } = require('../support/artifacts');
const { LOGIN_URL } = require('../support/auth');

const PIIRID = {
  // Tootmiskeskkond + SPA hüdratsioon: hoiame piirid helded, et test ei oleks
  // juhuslikult punane, aga ikka püüaks kinni tõsise regressiooni.
  ttfbMs: 3_000,
  loadMs: 15_000,
  readyMs: 20_000,
};

function logi(tulemus, testInfo) {
  const rida = {
    leht: tulemus.label,
    url: tulemus.url,
    ttfbMs: tulemus.navigation.ttfbMs,
    domContentLoadedMs: tulemus.navigation.domContentLoadedMs,
    loadMs: tulemus.navigation.loadMs,
    appReadyMs: tulemus.wall.readyMs,
    scriptMs: tulemus.cdp?.scriptDurationMs ?? null,
    taskMs: tulemus.cdp?.taskDurationMs ?? null,
    jsHeapMb: tulemus.cdp?.jsHeapUsedMb ?? null,
    ressursse: tulemus.resources.count,
    üleKantudKb: tulemus.resources.transferKb,
    mõõdetud: tulemus.measuredAt,
  };
  testInfo.annotations.push({ type: 'laadimisaeg', description: JSON.stringify(rida) });
  console.log('Laadimisaeg:', JSON.stringify(rida, null, 2));
  return rida;
}

baseTest.describe('Ülesanne 4 – lehe laadimisaeg', () => {
  baseTest('TC-04a Sisselogimislehe laadimisaeg', async ({ page }, testInfo) => {
    const tulemus = await measurePageLoad(page, {
      url: LOGIN_URL,
      ready: page.getByLabel('Kasutajatunnus', { exact: true }),
      label: 'konto/sisselogimine',
    });

    const rida = logi(tulemus, testInfo);
    savePerfRecord({ test: 'TC-04a', ...rida });

    expect(rida.ttfbMs, 'TTFB peab olema alla 3 s').toBeLessThan(PIIRID.ttfbMs);
    expect(rida.loadMs, 'load-event peab olema alla 15 s').toBeLessThan(PIIRID.loadMs);
    expect(rida.appReadyMs, 'vorm peab olema kasutatav 20 s jooksul').toBeLessThan(PIIRID.readyMs);
  });
});

test.describe('Ülesanne 4 – sisselogitud tunniplaani laadimisaeg', () => {
  test.skip(
    !hasCredentials(),
    'Siseveebi tunnused puuduvad – kopeeri .env.example failiks .env ja täida SISEVEEB_USER / SISEVEEB_PASS',
  );
  test('TC-04b Õpilase tunniplaani laadimisaeg', async ({ page }, testInfo) => {
    const tulemus = await measurePageLoad(page, {
      url: '/tunniplaan',
      ready: page.locator('.fc').first(),
      label: 'opilane/tunniplaan',
    });

    const rida = logi(tulemus, testInfo);
    savePerfRecord({ test: 'TC-04b', ...rida });

    expect(tulemus.readyVisible, 'tunniplaani kalender peab 30 s jooksul nähtavaks saama').toBe(true);
    expect(rida.ttfbMs, 'TTFB peab olema alla 3 s').toBeLessThan(PIIRID.ttfbMs);
    expect(rida.loadMs, 'load-event peab olema alla 15 s').toBeLessThan(PIIRID.loadMs);
    expect(rida.appReadyMs, 'kalender peab olema nähtav 20 s jooksul').toBeLessThan(PIIRID.readyMs);
  });
});
