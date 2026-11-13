# Testijuhtumid

Iga testijuhtum vastab ühele õppeülesande punktile. Eelduseks on `npm install` ja (sisselogimist nõudvates testides) täidetud `.env` fail.

---

## TC-01 — Õpilase tunniplaan (ülesanne 1)

| Väli | Väärtus |
|---|---|
| Fail | `tests/ui/01-opilase-tunniplaan.spec.js` |
| Eesmärk | Sisselogimise järel avada õpilase tunniplaan, veenduda, et kuvatakse nädalakalender, ja teha ekraanipilt |
| Eeldus | Kehtivad siseveebi tunnused `.env` failis |
| Testandmed | Konto `SISEVEEB_USER`, käesolev nädal |

**Sammud**

1. Ava `https://konto.siseveeb.voco.ee/?redirect_uri=https://opilane.siseveeb.voco.ee/`.
2. Täida „Kasutajatunnus“ ja „Parool“, vajuta „Sisene“.
3. Oota ümbersuunamist `opilane.siseveeb.voco.ee` keskkonda.
4. Ava `/tunniplaan`.
5. Oota, kuni FullCalendar'i kalender (`.fc`) on nähtav.
6. Vali nädala rippmenüüst „Käesoleva nädala tunniplaan“.
7. Loe kokku tunniplaanis olevad sündmused (`.fc-event`).
8. Tee täislehe ekraanipilt.

**Oodatav tulemus**

* URL jääb `https://opilane.siseveeb.voco.ee/tunniplaan` (ei suunata tagasi sisselogimisele).
* Kalender või hoiatus „Tunniplaan on alles loomisel“ on nähtav.
* Nädala valik (`role="combobox"`, nimi „Vali nädal“) on olemas.
* Käesoleval nädalal on vähemalt üks tund (pehme kontroll — vaheajal võib olla 0).
* Fail `docs/screenshots/tc01-opilase-tunniplaan.png`.

---

## TC-02 — Õpetajate tunniplaanid (ülesanne 2)

| Väli | Väärtus |
|---|---|
| Fail | `tests/ui/02-opetajate-tunniplaan.spec.js` |
| Eesmärk | Leida õpetaja tunniplaan ja teha pilt; korrata mitme õpetajaga (`test.each` loogika) |
| Eeldus | Sisselogitud sessioon, ligipääs `siseveeb.voco.ee/kutseope/...` vaatele |
| Testandmed | Aly Valvas, Maret Vaabel, Max Frolov (muudetav `SISEVEEB_OPETAJAD`-iga) |

**Sammud** (iga õpetaja kohta eraldi test)

1. Ava `https://siseveeb.voco.ee/kutseope/oppetoo/tunniplaan`.
2. Veendu, et ei ole suunatud `konto.siseveeb.voco.ee` lehele (sessioon kehtib).
3. Vali õpetaja: nimi lingina → otsinguväli → `<select>` → Vuetify `combobox`.
4. Oota tunniplaani sisu (tabel, FullCalendar või nädalaplaan).
5. Kontrolli, et õpetaja nimi on lehel nähtav.
6. Tee ekraanipilt `docs/screenshots/tc02-opetaja-<nimi>.png`.

**Oodatav tulemus**

* Iga õpetaja kohta eraldi PASS/FAIL tulemus.
* Leht kuvab valitud õpetaja tunniplaani ja nime.
* Kui sobivat juhtelementi ei leita: HTML + ekraanipilt `docs/diagnostika/` kausta ja selge veateade.

> Playwrightil puudub `test.each()`; kasutatakse Playwrighti dokumenteeritud tsüklit, mis genereerib iga andmerea jaoks eraldi testi.

---

## TC-03 — Erinevad lokaatorid (ülesanne 3)

| Väli | Väärtus |
|---|---|
| Fail | `tests/ui/03-lokaatorid.spec.js` |
| Eesmärk | Kasutada testis `getByRole`, `getByText`, `getByTestId` (ja `getByLabel`) |

**TC-03a — sisselogimisleht (ei vaja tunnuseid)**

1. Ava sisselogimisleht.
2. `getByText`: „VOCO Autentimiseteenus“, juhttekst.
3. `getByRole`: 2 tab'i (`Parool` valitud, `ID-kaart / SMART-id / Mobiil-ID`), 2 tekstivälja, nupud „Sisene“, „Unustasin parooli“, „Esita taotlus“.
4. `getByLabel`: „Kasutajatunnus“ väli.

Oodatav: kõik lokaatorid leiavad täpselt õige elemendi; `role="tab"` valitud olek on `aria-selected="true"`.

**TC-03b — õpilase tunniplaan (vajab tunnuseid)**

1. Ava `/tunniplaan`.
2. `getByText`: „Esmaspäev“ (nädalapäeva päis).
3. `getByRole`: combobox „Vali nädal“, nupud „Eelnev“ / „Järgnev“ / „Täna“.

Oodatav: kalender on nähtav, nädalapäevad ja nädala valik on locator'itega leitavad.

**TC-03c — `getByTestId` näidisleht**

1. Laadi leht, millel on `data-testid` atribuudid (`tunniplaan-tabel`, `tund-1`, `tund-2`, `tund-1-aine` jne).
2. Leia tabel ja tunnid `getByTestId`-ga, kontrolli teksti.

Oodatav: `getByTestId` leiab elemendid nii eraldi kui ka teise lokaatori sees (`tabel.getByTestId(...)`).

> Siseveebi päris lehtedel `data-testid` puudub, seetõttu on see osa näidislehel ja README-s on soovitus test-id-d lisada.

---

## TC-04 — Lehe laadimisaeg (ülesanne 4)

| Väli | Väärtus |
|---|---|
| Fail | `tests/ui/04-laadimisaeg.spec.js` |
| Eesmärk | Mõõta lehe laadimisaega `performance.now()` ja CDP mõõdikutega |

**TC-04a — sisselogimisleht**

1. Ava sisselogimisleht.
2. Mõõda: TTFB, DOMContentLoaded, load, „vorm on kasutatav“ aeg.
3. Kogu CDP `Performance.getMetrics` (ScriptDuration, TaskDuration, JS-hunn).
4. Salvesta `docs/perf-tulemused.json`.

Oodatav: TTFB < 3 s, load < 15 s, vorm kasutatav < 20 s.

**TC-04b — õpilase tunniplaan (vajab tunnuseid)**

Sama mõõtmine `/tunniplaan` lehel, ootemarkeriks `.fc` kalender.

Oodatav: kalender nähtav 30 s jooksul; TTFB < 3 s, load < 15 s, valmis < 20 s.

---

## TC-05 — Vale parool (ülesanne 5)

| Väli | Väärtus |
|---|---|
| Fail | `tests/ui/05-login-vead.spec.js` |
| Eesmärk | Kontrollida vale parooli ja tühjade väljade veateateid |
| Eeldus | Puudub (kasutatakse väljamõeldud kasutajat) |

**TC-05a — vale parool**

1. Sisesta kasutajatunnus `test.kasutaja.123`, parool `ValeParool123!`.
2. Vajuta „Sisene“.
3. Oota veateadet.

Oodatav: `role="status"` teade „Sisselogimine ebaõnnestus“; URL jääb konto-lehele; `siseveeb*` küpsist ei teki.

**TC-05b — tühjad väljad**

1. Vajuta „Sisene“ tühjade väljadega.

Oodatav: teade „Vormi sisestuse viga“; väljad jäävad muudetavaks.

**TC-05c — kasutaja olemasolu mitte paljastamine**

1. Proovi kahe erineva olematu kasutajaga (tavaline tunnus ja isikukoodi kujuline).
2. Võrdle veateateid.

Oodatav: mõlemal juhul identne üldine veateade „Sisselogimine ebaõnnestus“.
