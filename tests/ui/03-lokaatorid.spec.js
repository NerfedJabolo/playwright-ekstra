'use strict';

// Ülesanne 3: test, mis kasutab erinevaid locator'eid:
//   getByRole, getByText, getByTestId (ja lisaks getByLabel).
//
// Siseveebi päris lehtedel data-testid atribuute ei ole (kontrollitud nii DOM-ist
// kui ka rakenduse JS-koodist – seal on ainult Vuetify sisemised test-id-d).
// Seetõttu:
//   TC-03a ja TC-03b kasutavad päris siseveebi lehti (roll + tekst + label),
//   TC-03c demonstreerib getByTestId toimimist näidislehel ja dokumenteerib,
//   millised test-id-d peaks siseveebi arendaja lisama.
const { baseTest, test, expect } = require('../support/fixtures');
const { hasCredentials } = require('../support/env');
const { LOGIN_URL } = require('../support/auth');

baseTest.describe('Ülesanne 3 – lokaatorid', () => {
  baseTest('TC-03a getByRole, getByText ja getByLabel sisselogimislehel', async ({ page }) => {
    await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded' });

    // getByText – pealkirjad ja juhttekst
    await expect(page.getByText('VOCO Autentimiseteenus', { exact: true })).toBeVisible();
    await expect(page.getByText(/Sisselogimiseks kasutage siseveebi kasutajatunnust/)).toBeVisible();

    // getByRole – tab-id, väljad, nupud
    const tabid = page.getByRole('tab');
    await expect(tabid).toHaveCount(2);
    await expect(page.getByRole('tab', { name: 'Parool', exact: true })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('tab', { name: 'ID-kaart / SMART-id / Mobiil-ID', exact: true })).toBeVisible();

    await expect(page.getByRole('textbox')).toHaveCount(2);
    await expect(page.getByRole('button', { name: 'Sisene', exact: true })).toBeEnabled();
    await expect(page.getByRole('button', { name: 'Unustasin parooli', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Esita taotlus', exact: true })).toBeVisible();

    // getByRole + accessible name tuleb <label for> seosest.
    // NB! Vuetify renderdab nii hõljuva labeli kui ka placeholder' i, mistõttu on
    // accessible name dubleeritud ("Kasutajatunnus Kasutajatunnus") – seetõttu
    // kasutame regexit, mitte exact-võrdlust.
    await expect(page.getByRole('textbox', { name: /Kasutajatunnus/ })).toBeVisible();
    await expect(page.getByRole('textbox', { name: /Parool/ })).toBeVisible();
    // getByLabel – sama element, label'i järgi
    await expect(page.getByLabel('Kasutajatunnus', { exact: true })).toBeVisible();

    // Positiivne kontroll: rollipõhine lokaator leiab täpselt ühe "Sisene" nupu
    await expect(page.getByRole('button', { name: 'Sisene', exact: true })).toHaveCount(1);
  });

  baseTest('TC-03c getByTestId näidislehel (siseveebil data-testid puudub)', async ({ page }) => {
    // Näidisleht matkib tunniplaani tabelit, kuhu on lisatud data-testid atribuudid.
    await page.setContent(`
      <main>
        <h1>Tunniplaan</h1>
        <div data-testid="tunniplaan-tabel">
          <div data-testid="tund-1">
            <span data-testid="tund-1-aeg">08:30–10:00</span>
            <span data-testid="tund-1-aine">Programmeerimine</span>
            <span data-testid="tund-1-opetaja">Aly Valvas</span>
          </div>
          <div data-testid="tund-2">
            <span data-testid="tund-2-aeg">10:15–11:45</span>
            <span data-testid="tund-2-aine">Andmebaasid</span>
            <span data-testid="tund-2-opetaja">Maret Vaabel</span>
          </div>
        </div>
      </main>
    `);

    const tabel = page.getByTestId('tunniplaan-tabel');
    await expect(tabel).toBeVisible();

    const teineTund = page.getByTestId('tund-2');
    await expect(teineTund.getByTestId('tund-2-aine')).toHaveText('Andmebaasid');
    await expect(teineTund.getByTestId('tund-2-opetaja')).toHaveText('Maret Vaabel');
    await expect(page.getByTestId('tund-1-aeg')).toHaveText('08:30–10:00');

    // getByTestId on lokaator nagu iga teine – saab kombineerida getByRole'iga.
    await expect(tabel.getByTestId('tund-1')).toContainText('Programmeerimine');
    await expect(page.getByTestId('tund-2')).toContainText('Maret Vaabel');
  });
});

// --- Sisselogitud vaated (vajavad .env tunnuseid) -------------------------

test.describe('Ülesanne 3 – lokaatorid sisselogitud tunniplaanil', () => {
  test.skip(
    !hasCredentials(),
    'Siseveebi tunnused puuduvad – kopeeri .env.example failiks .env ja täida SISEVEEB_USER / SISEVEEB_PASS',
  );
  test('TC-03b getByRole ja getByText õpilase tunniplaanil', async ({ page }) => {
    await page.goto('/tunniplaan', { waitUntil: 'domcontentloaded' });

    const kalender = page.locator('.fc').first();
    await expect(kalender).toBeVisible({ timeout: 30_000 });

    // getByText – nädalapäevade päised (FullCalendar, eesti keel)
    await expect(page.getByText('Esmaspäev', { exact: false }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Täna', exact: true }).first()).toBeVisible();

    // getByRole – nädala valiku combobox (Vuetify select)
    await expect(page.getByRole('combobox', { name: /Vali nädal/i }).first()).toBeVisible();

    // FullCalendar'i tööriistariba nupud (pehmelt – sõltub, kas rakendus
    // renderdab vaikimisi tööriistariba või oma nuppude grupi).
    await expect.soft(page.getByRole('button', { name: 'Järgnev', exact: true }).first()).toBeVisible();
    await expect.soft(page.getByRole('button', { name: 'Eelnev', exact: true }).first()).toBeVisible();

    // Nädalavaade: esmaspäevast reedeni on viis päise-lahterit.
    expect(await page.locator('.fc-col-header-cell').count()).toBeGreaterThanOrEqual(5);
  });
});
