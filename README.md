# Siseveebi Playwrighti testid

Playwrighti testid VoCo siseveebile: sisselogimine, õpilase ja õpetajate tunniplaan, erinevad lokaatorid, lehe laadimisaeg ja vale parooli veateated.

| Väli | Väärtus |
|---|---|
| Testitav rakendus | Siseveeb — <https://konto.siseveeb.voco.ee>, <https://opilane.siseveeb.voco.ee>, <https://siseveeb.voco.ee> |
| Raamistik | Playwright 1.65.0 (`@playwright/test`) |
| Brauser | Chromium (Chrome for Testing), headless |
| Teste kokku | 12 (5 testijuhtu, õpetajate test on 3 reaga) |
| Viimane jooks | **6 PASS, 6 SKIPPED** (13.11.2026) — sisselogimist nõudvad testid on kirjutatud, aga jooksutamata, sest `.env` tunnused puudusid |
| Keel | Eesti |

## Kiirestart

```bash
cd siseveeb-playwright-tests
npm install

# sisselogimiseks vajalikud tunnused (ülesanded 1 ja 2)
cp .env.example .env
#   SISEVEEB_USER=sinu.kasutajatunnus
#   SISEVEEB_PASS=sinu.parool

npm test
```

HTML-aruanne: `npm run test:report`

Ainult sisselogimiseta testid (ei vaja tunnuseid):

```bash
npm run test:public
```

## Testid

| ID | Ülesanne | Test | Fail | Tulemus |
|---|---|---|---|---|
| TC-01 | 1. Õpilase tunniplaan + ekraanipilt | Tunniplaan avaneb, nädalakalender ja nädala valik on nähtavad | [`tests/ui/01-opilase-tunniplaan.spec.js`](tests/ui/01-opilase-tunniplaan.spec.js) | SKIPPED (vajab `.env`) |
| TC-02 | 2. Õpetajate tunniplaanid (`test.each` loogika) | Aly Valvas, Maret Vaabel, Max Frolov — igaühe kohta eraldi test ja pilt | [`tests/ui/02-opetajate-tunniplaan.spec.js`](tests/ui/02-opetajate-tunniplaan.spec.js) | SKIPPED (vajab `.env`) |
| TC-03a | 3. Lokaatorid | `getByRole`, `getByText`, `getByLabel` sisselogimislehel | [`tests/ui/03-lokaatorid.spec.js`](tests/ui/03-lokaatorid.spec.js) | **PASS** |
| TC-03b | 3. Lokaatorid | `getByRole` + `getByText` õpilase tunniplaanil | sama fail | SKIPPED (vajab `.env`) |
| TC-03c | 3. Lokaatorid | `getByTestId` näidislehel (siseveebil `data-testid` puudub) | sama fail | **PASS** |
| TC-04a | 4. Laadimisaeg | Sisselogimislehe laadimisaeg (`performance.now()` + Navigation Timing + CDP) | [`tests/ui/04-laadimisaeg.spec.js`](tests/ui/04-laadimisaeg.spec.js) | **PASS** |
| TC-04b | 4. Laadimisaeg | Õpilase tunniplaani laadimisaeg | sama fail | SKIPPED (vajab `.env`) |
| TC-05a | 5. Vale parool | Vale parool → „Sisselogimine ebaõnnestus“, sessiooni ei teki | [`tests/ui/05-login-vead.spec.js`](tests/ui/05-login-vead.spec.js) | **PASS** |
| TC-05b | 5. Vale parool | Tühjad väljad → „Vormi sisestuse viga“ | sama fail | **PASS** |
| TC-05c | 5. Vale parool | Veateade ei reeda, kas kasutaja on olemas | sama fail | **PASS** |

## Mida testid teevad

### Sisselogimine (`tests/support/fixtures.js`)

Üks sisselogimine worker'i kohta: `loginViaUI()` täidab `Kasutajatunnus` / `Parool` väljad, vajutab „Sisene“ ja ootab ümbersuunamist `opilane.siseveeb.voco.ee`-le. Tulemus (`storageState`) kopeeritakse igasse testikonteksti, seega iga test saab puhta brauseri, aga sisselogimist ei korrata.

Tunnused tulevad ainult `.env` failist või keskkonnamuutujatest (`SISEVEEB_USER`, `SISEVEEB_PASS`) — koodis ega repos ei ole ühtegi parooli.

### Ülesanne 2 ja `test.each()`

Playwright Testil **ei ole** Jest'i `test.each()` meetodit. Playwrighti ametlik viis on sama tulemus anda tsükliga — iga andmerida genereerib eraldi testi:

```js
for (const õpetaja of ÕPETAJAD) {
  test(`TC-02 Õpetaja tunniplaan: ${õpetaja}`, async ({ page }) => { /* ... */ });
}
```

Nii saab iga õpetaja kohta eraldi tulemuse, eraldi vea ja eraldi ekraanipildi. Õpetajate nimekiri on vaikimisi `Aly Valvas, Maret Vaabel, Max Frolov` ja seda saab muuta `.env` muutujaga `SISEVEEB_OPETAJAD`.

Õpetaja vaate lehel proovitakse järjest: õpetaja nimi lingina → otsinguväli → `<select>` → Vuetify `combobox`. Kui ükski ei sobi, salvestatakse lehe HTML ja ekraanipilt `docs/diagnostika/` kausta ning test ebaõnnestub selge teatega.

### Ülesanne 3 ja `getByTestId`

Siseveebi lehtedel **ei ole** `data-testid` atribuute (kontrollitud DOM-ist ja rakenduse JS-koodist — seal leidub ainult Vuetify sisemisi test-id-sid, nt kuupäevavalija `month-btn`).

Seetõttu:

* TC-03a ja TC-03b kasutavad päris lehtedel `getByRole`, `getByText` ja `getByLabel`;
* TC-03c demonstreerib `getByTestId` toimimist näidislehel ja dokumenteerib soovituse arendajale.

Soovitus siseveebi arendajale: lisada tunniplaani tabelile `data-testid` (nt `tunniplaan-tabel`, `tund-<n>-aine`), siis saaks testid muuta tekstimuudatuste suhtes immuunseks.

### Ülesanne 4 ja `page.metrics()`

`page.metrics()` on **Puppeteer**'i API, Playwrightil seda ei ole. Laadimisaeg mõõdetakse kahel viisil:

1. `performance.now()` + Navigation Timing API (`page.evaluate` sees): TTFB, DOMContentLoaded, load, ülekantud maht;
2. CDP `Performance.getMetrics`: `ScriptDuration`, `TaskDuration`, JS-hunn.

Lisaks mõõdetakse „rakendus on valmis“ aeg seinakellaga (`Date.now()` navigeerimise algusest kuni ootemarkerini). Tulemused kirjutatakse `docs/perf-tulemused.json` faili ja manustatakse aruandesse.

### Ülesanne 5 ja vale parool

Test kasutab tahtlikult **väljamõeldud** kasutajat, et päris kontot mitte lukustada. Kontrollitakse:

* veateade „Sisselogimine ebaõnnestus“ on nähtav `role="status"` elemendina;
* kasutaja jääb `konto.siseveeb.voco.ee` lehele;
* `siseveeb*` sessiooniküpsist ei teki;
* tühjade väljadega kuvatakse „Vormi sisestuse viga“;
* sama üldine veateade erinevate kasutajate puhul (ei saa kontrollida, kas kasutaja on olemas).

## Projektistruktuur

```
siseveeb-playwright-tests/
├── package.json
├── playwright.config.js
├── .env.example          # mall tunnuste jaoks (koopia -> .env)
├── tests/
│   ├── support/
│   │   ├── env.js        # .env lugeja
│   │   ├── auth.js       # sisselogimine
│   │   ├── fixtures.js   # authSession-fixtuur + küpsiste kopeerimine
│   │   ├── perf.js       # laadimisaja mõõtmine
│   │   └── artifacts.js  # ekraanipildid, perf-tulemused
│   └── ui/
│       ├── 01-opilase-tunniplaan.spec.js
│       ├── 02-opetajate-tunniplaan.spec.js
│       ├── 03-lokaatorid.spec.js
│       ├── 04-laadimisaeg.spec.js
│       └── 05-login-vead.spec.js
├── docs/
│   ├── testjuhud.md
│   ├── ARUANNE.md
│   ├── perf-tulemused.json
│   ├── screenshots/
│   └── diagnostika/      # tekib ainult õpetaja vaate ebaõnnestumisel
├── playwright-report/    # HTML-aruanne
└── test-results/         # JSON-tulemused, jäljed
```

## Dokumentatsioon

| Dokument | Sisu |
|---|---|
| [`docs/testjuhud.md`](docs/testjuhud.md) | Testijuhtumid: eesmärk, eeldused, sammud, oodatav tulemus |
| [`docs/ARUANNE.md`](docs/ARUANNE.md) | Aruanne: tulemused, leitud probleemid, järeldused |
| [`docs/screenshots/`](docs/screenshots/) | Ekraanipildid |
| [`docs/perf-tulemused.json`](docs/perf-tulemused.json) | Laadimisaegade mõõtmised |

## Märkused

* Siseveeb on tootmiskeskkond — testid ei muuda andmeid, ainult loevad ja pildistavad.
* `siseveeb.voco.ee/kutseope/...` vaade võib nõuda õpetaja/administraatori õigusi. Kui õpilase kontoga sinna ei pääse, suunatakse test konto-lehele ja test annab selle kohta selge veateate.
* `.env` on `.gitignore`'is; parooli ei tohi kunagi reposse ega aruandesse panna.
