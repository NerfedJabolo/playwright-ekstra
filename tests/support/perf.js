'use strict';

// Lehe laadimisaja mõõtmine.
//
// Playwrightil ei ole `page.metrics()` meetodit (see on Puppeteer API).
// Playwrightis kasutatakse selle asemel:
//   1) performance.now() + Navigation Timing API (page.evaluate sees),
//   2) Chrome DevTools Protocoli `Performance.getMetrics` (CDP sessioon).
// Mõlemad on siin implementeeritud ja tulemused ühendatakse.
//
// CDP sessioon avatakse ENNE navigeerimist, muidu jäävad skripti- ja
// ülesandekestuse loendurid nulli juurde.

/**
 * Mõõdab lehe laadimise: navigatsiooni algusest kuni "rakendus on valmis"
 * (kuni ootemarker on nähtav) ning kogub Navigation Timing + CDP mõõdikud.
 *
 * @param {import('@playwright/test').Page} page
 * @param {{url: string, ready?: import('@playwright/test').Locator, label?: string}} options
 */
async function measurePageLoad(page, { url, ready, label = url }) {
  let session = null;
  try {
    session = await page.context().newCDPSession(page);
    await session.send('Performance.enable');
  } catch {
    session = null; // Firefox/WebKit ei toeta CDP-d
  }

  // performance.now() alus dokumentatsiooni alguses, et mõõta ka SPA hüdratsiooni.
  await page.addInitScript(() => {
    window.__pwPerf = { start: performance.now(), domContentLoaded: null, load: null };
    window.addEventListener('DOMContentLoaded', () => {
      window.__pwPerf.domContentLoaded = performance.now();
    });
    window.addEventListener('load', () => {
      window.__pwPerf.load = performance.now();
    });
  });

  const wallStart = Date.now();
  await page.goto(url, { waitUntil: 'load' });
  const wallLoadMs = Date.now() - wallStart;

  let readyVisible = false;
  if (ready) {
    readyVisible = await ready
      .waitFor({ state: 'visible', timeout: 30_000 })
      .then(() => true)
      .catch(() => false);
  }
  const wallReadyMs = Date.now() - wallStart;

  const client = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0] || {};
    const resources = performance.getEntriesByType('resource');
    const round = (value) => (Number.isFinite(value) ? Math.round(value * 10) / 10 : null);

    return {
      perfReadyMs: performance.now(),
      events: window.__pwPerf,
      navigation: {
        type: nav.type ?? null,
        redirectMs: round(nav.redirectEnd - nav.redirectStart),
        dnsMs: round(nav.domainLookupEnd - nav.domainLookupStart),
        connectMs: round(nav.connectEnd - nav.connectStart),
        ttfbMs: round(nav.responseStart - nav.requestStart),
        responseMs: round(nav.responseEnd - nav.responseStart),
        domContentLoadedMs: round(nav.domContentLoadedEventEnd),
        loadMs: round(nav.loadEventEnd),
        transferSizeKb: round((nav.transferSize || 0) / 1024),
      },
      resourceCount: resources.length,
      resourceTransferKb: round(resources.reduce((sum, r) => sum + (r.transferSize || 0), 0) / 1024),
    };
  });

  const cdp = session ? await readCdpMetrics(session) : null;
  if (session) await session.detach().catch(() => {});

  const loadEventEnd = client.events?.load;
  return {
    label,
    url: page.url(),
    measuredAt: new Date().toISOString(),
    readyVisible,
    wall: { loadMs: wallLoadMs, readyMs: wallReadyMs },
    hydrationMs:
      loadEventEnd == null ? null : Math.round((client.perfReadyMs - loadEventEnd) * 10) / 10,
    navigation: client.navigation,
    resources: { count: client.resourceCount, transferKb: client.resourceTransferKb },
    cdp,
  };
}

/** Chrome DevTools Protocoli Performance.getMetrics (ainult Chromium). */
async function readCdpMetrics(session) {
  const { metrics } = await session.send('Performance.getMetrics');
  const map = Object.fromEntries(metrics.map((metric) => [metric.name, metric.value]));
  const perMs = (name) => (map[name] == null ? null : Math.round(map[name] * 1000 * 10) / 10);
  return {
    scriptDurationMs: perMs('ScriptDuration'),
    taskDurationMs: perMs('TaskDuration'),
    layoutDurationMs: perMs('LayoutDuration'),
    recalcStyleDurationMs: perMs('RecalcStyleDuration'),
    jsHeapUsedMb: map.JSHeapUsedSize ? Math.round((map.JSHeapUsedSize / 1024 / 1024) * 10) / 10 : null,
    domNodes: map.Nodes ?? null,
  };
}

module.exports = { measurePageLoad, readCdpMetrics };
