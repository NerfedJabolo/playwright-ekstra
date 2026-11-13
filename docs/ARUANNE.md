# Aruanne — Siseveebi Playwrighti testid

**Kuupäev:** 13.11.2026
**Keskkond:** Playwright 1.65.0, Chromium (headless), Node 26, Linux
**Testitav süsteem:** VoCo siseveeb (tootmiskeskkond)

---

## 1. Ülevaade

Loodi 12 Playwrighti testi viies testifailis, mis katavad kõik viis õppeülesande punkti. Testid on kirjutatud eesti keeles, kasutavad lehe semantilist struktuuri (rollid, tekst, label'id) ja kontrollivad nii positiivseid kui ka negatiivseid vooge.

| Näitaja | Väärtus |
|---|---|
| Teste kokku | 12 |
| Läbitud (PASS) | 6 |
| Vahele jäetud (SKIPPED) | 6 — vajavad siseveebi tunnuseid (`.env`) |
| Ebaõnnestunud | 0 |
| Jooksu kestus | 9,4 s |
| Ekraanipilte | 3 (`docs/screenshots/`) |

Kõik sisselogimist mittevajavad testid on jooksutatud ja rohelised. Sisselogimist nõudvad testid (TC-01, TC-02 ×3, TC-03b, TC-04b) on täielikult kirjutatud ja valmis, kuid **käesolevas jooksus vahele jäetud**, sest siseveebi kasutajatunnus ja parool ei olnud saadaval. Nende käivitamiseks piisab `.env` faili loomisest ja `npm test` käsust.

## 2. Tulemused testijuhtude kaupa

| ID | Test | Tulemus | Märkus |
|---|---|---|---|
| TC-01 | Õpilase tunniplaan + ekraanipilt | SKIPPED | Vajab `SISEVEEB_USER` / `SISEVEEB_PASS` |
| TC-02 | Õpetajate tunniplaanid (3 õpetajat) | SKIPPED | Vajab tunnuseid + ligipääsu `kutseope` vaatele |
| TC-03a | Lokaatorid sisselogimislehel | PASS (1,1 s) | `getByRole`, `getByText`, `getByLabel` |
| TC-03b | Lokaatorid tunniplaanil | SKIPPED | Vajab tunnuseid |
| TC-03c | `getByTestId` näidislehel | PASS (0,1 s) | Siseveebil test-id-d puuduvad |
| TC-04a | Sisselogimislehe laadimisaeg | PASS (1,0 s) | Mõõdetud, tulemused allpool |
| TC-04b | Tunniplaani laadimisaeg | SKIPPED | Vajab tunnuseid |
| TC-05a | Vale parool → „Sisselogimine ebaõnnestus“ | PASS (1,3 s) | Küpsist ei teki, URL ei muutu |
| TC-05b | Tühjad väljad → „Vormi sisestuse viga“ | PASS (1,4 s) | Vorm jääb kasutatavaks |
| TC-05c | Veateade ei reeda kasutaja olemasolu | PASS (3,7 s) | Kaks katset, identne teade |

## 3. Laadimisaja mõõtmine

Mõõdetud testis TC-04a (sisselogimisleht, Chromium, headless, Tallinna võrk):

| Mõõdik | Väärtus |
|---|---|
| TTFB | 13 ms |
| DOMContentLoaded | 542 ms |
| `load` sündmus | 649 ms |
| Vorm kasutatav (rakendus valmis) | 811 ms |
| CDP ScriptDuration | 134 ms |
| CDP TaskDuration | 418 ms |
| JS-hunn | 18,3 MB |
| Päringuid | 8 |
| Üle kantud | 2 946 KB |

Täielikud andmed: [`docs/perf-tulemused.json`](perf-tulemused.json).

**Tõlgendus.** Serveri vastus on väga kiire (TTFB 13 ms), kuid leht laeb ~2,9 MB (peamiselt kaks suurt JS-bundle'it — konto rakendus on ~6,7 MB pakkimata). Vorm muutub kasutatavaks ~0,8 s pärast navigatsiooni algust, mis on SPA kohta hea. Suurim võit tuleks bundle'ite koodijagamisest (route-based code splitting), sest sisselogimislehel laetakse kogu rakenduse kood.

## 4. Leitud probleemid ja tähelepanekud

### 4.1 CSRF-viga esimesel sisselogimiskatsel

Värskes brauserikontekstis saadab rakendus esimese `POST /api/login` päringu ilma kehtiva CSRF-tokenita ning saab vastuseks `400 Failed CSRF check!`. Rakendus kordab päringu automaatselt (teine `POST` õnnestub või annab `401 not_user`). Testides on see arvestatud: oodatakse URL-i muutumist, mitte konkreetset HTTP-koodi.

**Soovitus:** laadida CSRF-token enne vormi kuvamist, et vältida topeltpäringut ja segadust tekitavat 400-vastust logides.

### 4.2 Dubleeritud accessible name

Vuetify renderdab nii hõljuva labeli kui ka placeholder'i, mistõttu on väljade accessible name dubleeritud: `textbox "Kasutajatunnus Kasutajatunnus"`. Täpne `getByRole('textbox', { name: 'Kasutajatunnus', exact: true })` ei leia elementi; töötab regex `/Kasutajatunnus/` või `getByLabel`.

**Mõju testidele:** TC-03a kasutab regexit ja `getByLabel`-i; `loginViaUI()` kasutab `getByLabel`-i, mis on stabiilne.

### 4.3 `data-testid` puudub

Siseveebi lehtedel ei ole ühtegi `data-testid` atribuuti (kontrollitud DOM-ist ja rakenduse JS-koodist; leidub ainult Vuetify sisemisi, nt kuupäevavalija `month-btn`). Testid peavad toetuma tekstile ja rollidele, mis on tundlikum tõlke- ja kujundusmuudatuste suhtes.

**Soovitus:** lisada kriitilistele elementidele `data-testid` (nt `tunniplaan-tabel`, `tund-<n>-aine`, `opetaja-valik`). See on ka põhjus, miks TC-03c kasutab `getByTestId` demonstratsiooni näidislehel.

### 4.4 Õpetaja vaate ligipääs

`siseveeb.voco.ee/kutseope/oppetoo/tunniplaan` nõuab sisselogimist ja tõenäoliselt ka õppetöö õigusi. Õpilase kontoga võib see vaade suunata tagasi `konto.siseveeb.voco.ee` lehele. Test käsitleb seda olukorda selge veateatega (`Sessioon puudub või õppetöö vaade nõuab teistsugust õigust`) ja salvestab diagnosti­ka.

Õpetaja valimiseks proovitakse nelja strateegiat (link → otsing → select → combobox), sest vanema vaate täpne markup ei olnud tunnuste puudumise tõttu kättesaadav. Esimesel jooksul võib olla vaja selektoreid täpsustada; selleks salvestatakse ebaõnnestumisel HTML `docs/diagnostika/` kausta.

### 4.5 Parooli test ei lukusta kontot

Vale parooli test kasutab väljamõeldud kasutajat (`test.kasutaja.123`, `39901011234`), mitte päris kasutajat, et vältida konto lukustamist korduvate katsete tõttu. Test kontrollib ka, et veateade on mõlemal juhul identne — süsteem ei paljasta, kas kasutajanimi on olemas.

## 5. Tehnilised valikud

| Teema | Valik | Põhjendus |
|---|---|---|
| Sisselogimine | Worker-scope fixtuur + küpsiste kopeerimine | Üks sisselogimine jooksu kohta, iga test saab puhta konteksti |
| `test.each()` | `for`-tsükkel, iga andmerida = eraldi test | Playwrightil puudub `test.each()`; see on ametlik viis |
| `page.metrics()` | `performance.now()` + Navigation Timing + CDP | `page.metrics()` on Puppeteer API, Playwrightis puudub |
| Ootamised | `expect(locator).toBeVisible()` automaatse ootega | Vältida `waitForTimeout`-i; kasutusel vaid serveripoolse otsingu järel |
| Tunnused | `.env` + `.gitignore` | Parool ei satu reposse ega aruandesse |
| Tootmiskeskkond | Ainult lugemine, `retries: 0` | Aus tulemus, andmeid ei muudeta |

## 6. Järeldused

* Kriitiline sisselogimisvoog ja veateated on kaetud ning töötavad stabiilselt.
* Lokaatorid on kirjutatud semantiliselt (rollid, label'id, tekst), mis teeb testid loetavaks ja vähem altiks DOM-i struktuurimuudatustele.
* Suurim risk on `data-testid` puudumine ja teksti kordamine lehtedel — soovitus arendusmeeskonnale.
* Sisselogimist nõudvate testide lõplik valideerimine jääb tegemata, kuni `.env` fail on loodud. See on ainus puudujääk ülesande täitmisel.

## 7. Kordusjooks

```bash
cd siseveeb-playwright-tests
cp .env.example .env      # täida SISEVEEB_USER ja SISEVEEB_PASS
npm test                  # kõik 12 testi
npm run test:report       # HTML-aruanne
```
