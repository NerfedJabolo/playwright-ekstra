'use strict';

// Ekraanipiltide ja mõõtmistulemuste abifunktsioonid.
const fs = require('fs');
const path = require('path');

const DOCS_DIR = path.join(__dirname, '..', '..', 'docs');
const SHOT_DIR = path.join(DOCS_DIR, 'screenshots');

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

/**
 * Teeb täislehe ekraanipildi docs/screenshots/ kausta ja lisab selle
 * testiaruandesse manuseks.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} name failinimi ilma laiendita, nt "tc01-tunniplaan"
 * @param {import('@playwright/test').TestInfo} [testInfo]
 * @returns {Promise<string>} loodud faili tee
 */
async function screenshot(page, name, testInfo) {
  ensureDir(SHOT_DIR);
  const file = path.join(SHOT_DIR, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true, animations: 'disabled' });
  if (testInfo) {
    await testInfo.attach(`${name}.png`, { path: file, contentType: 'image/png' });
  }
  return file;
}

/** Kirjutab mõõtmistulemuse docs/perf-tulemused.json faili (massiivina). */
function savePerfRecord(record, file = path.join(DOCS_DIR, 'perf-tulemused.json')) {
  ensureDir(path.dirname(file));
  let records = [];
  if (fs.existsSync(file)) {
    try {
      records = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (!Array.isArray(records)) records = [];
    } catch {
      records = [];
    }
  }
  // Iga testi kohta hoiame viimast mõõtmist (kordusjooks ei kuhja ajalugu).
  records = records.filter((item) => item.test !== record.test);
  records.push(record);
  fs.writeFileSync(file, `${JSON.stringify(records, null, 2)}\n`, 'utf8');
  return file;
}

module.exports = { screenshot, savePerfRecord, SHOT_DIR, DOCS_DIR };
