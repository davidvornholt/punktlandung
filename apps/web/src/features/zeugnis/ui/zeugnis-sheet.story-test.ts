import type * as playwright from '@playwright/test';
import { expect, test as it } from '@playwright/test';

/** What the fixtures of the stories hold. */
const fixture = {
  /** Fächer of the Kursstufe story that have a Note, and so a disc. */
  landed: 6,
  /** Fach, Noten, Fachschnitt, Gerundet auf, Halbjahresnote. */
  columns: 5,
  /** A phone's table leaves out the number of Noten. */
  phoneColumns: 4,
  phone: { width: 390, height: 844 },
  /** WCAG AA for text of this size. */
  minTextContrast: 4.5,
} as const;

const jahresvorschau = /Jahresvorschau/u;

const rowOf = (table: playwright.Locator, fach: string) =>
  table.getByRole('row').filter({
    has: table.page().getByRole('rowheader', { name: fach }),
  });

it('zeigt je Fach den Fachschnitt und die Halbjahresnote, auf die er gerundet wird', async ({
  mount,
}) => {
  const component = await mount('features/zeugnis/ui/zeugnis-sheet/Punkte');
  const table = component.getByRole('table', {
    name: 'Halbjahresnoten in J1.1',
  });

  await expect(table.getByRole('columnheader')).toHaveCount(fixture.columns);
  await expect(rowOf(table, 'Deutsch').getByRole('cell')).toHaveText([
    '3',
    '10,8',
    '',
    '11 P.',
  ]);
  // Genau auf der Grenze wird im Punktesystem aufgerundet.
  await expect(rowOf(table, 'Mathematik')).toContainText('12,5');
  await expect(rowOf(table, 'Mathematik')).toContainText('13 P.');
  await expect(rowOf(table, 'Sport').getByRole('cell')).toHaveText([
    '0',
    'noch keine Note',
  ]);
  await expect(
    table.getByRole('rowheader', { name: 'Latein (archiviert)' }),
  ).toBeVisible();
  await expect(
    table.getByRole('link', { name: 'Deutsch', exact: true }),
  ).toHaveAttribute('href', '/noten?halbjahr=j1-1&fach=deutsch');
});

it('legt jedes Fach mit Note als Scheibe auf seine Halbjahresnote', async ({
  mount,
}) => {
  const component = await mount('features/zeugnis/ui/zeugnis-sheet/Punkte');
  const figure = component.getByRole('group', {
    name: 'Halbjahresnoten auf der Skala. Schnitt aller Halbjahresnoten: 11 P.',
  });

  await expect(figure.locator('[data-disc]')).toHaveCount(fixture.landed);
  await expect(figure.locator('[data-disc="sport"]')).toHaveCount(0);
  await expect(figure.locator('[data-disc="latein"]')).toHaveText('Lat');
  await expect(figure.locator('[data-part="fulcrum-value-big"]')).toHaveText(
    '11 P.',
  );
  await expect(
    figure.getByRole('link', {
      name: 'Ph, Physik: Halbjahresnote 12 P., Fachschnitt 12,33 P.',
    }),
  ).toHaveAttribute('href', '/noten?halbjahr=j1-1&fach=physik');
});

it('hebt Zeile und Scheibe eines Fachs gemeinsam hervor', async ({
  mount,
  page,
}) => {
  const component = await mount('features/zeugnis/ui/zeugnis-sheet/Punkte');
  const table = component.getByRole('table', {
    name: 'Halbjahresnoten in J1.1',
  });
  const disc = component.locator('[data-disc="physik"]');
  const row = rowOf(table, 'Physik');

  await row.hover();
  await expect(disc).toHaveAttribute('data-hover', '');
  await expect(row).toHaveAttribute('data-highlight', '');
  await rowOf(table, 'Deutsch').hover();
  await expect(disc).not.toHaveAttribute('data-hover', '');

  // Mit der Tastatur: der Fokus auf einer Scheibe hebt ihre Zeile hervor.
  await page.mouse.move(0, 0);
  await component
    .getByRole('link', {
      name: 'Ph, Physik: Halbjahresnote 12 P., Fachschnitt 12,33 P.',
    })
    .focus();
  await expect(row).toHaveAttribute('data-highlight', '');
  await table.getByRole('link', { name: 'Englisch', exact: true }).focus();
  await expect(row).not.toHaveAttribute('data-highlight', '');
  await expect(component.locator('[data-disc="englisch"]')).toHaveAttribute(
    'data-hover',
    '',
  );
});

it('zeigt im Sechsersystem Viertelnoten und die Jahresvorschau mit Grenzfällen', async ({
  mount,
}) => {
  const component = await mount('features/zeugnis/ui/zeugnis-sheet/Sechser');
  const table = component.getByRole('table', {
    name: 'Halbjahresnoten in 10.2',
  });

  await expect(rowOf(table, 'Biologie')).toContainText('2-3');
  // Genau zwischen zwei Viertelnoten zählt die schlechtere.
  await expect(rowOf(table, 'Mathematik')).toContainText('1,63');
  await expect(rowOf(table, 'Mathematik')).toContainText('2+');
  // Noten that carry no weight are told apart from no Noten at all.
  await expect(rowOf(table, 'Kunst').getByRole('cell')).toHaveText([
    '0',
    'noch keine Note',
  ]);
  await expect(rowOf(table, 'Musik').getByRole('cell')).toHaveText([
    '1',
    'keine Note zählt',
  ]);
  await expect(
    component.getByText('genau auf einer Grenze zählt die schlechtere Note', {
      exact: false,
    }),
  ).toBeVisible();
  await expect(component.locator('[data-part="fulcrum-value-big"]')).toHaveText(
    '2,7',
  );

  await expect(
    component.getByRole('heading', { name: 'Jahresvorschau 2025/26' }),
  ).toBeVisible();
  const preview = component.getByRole('table', {
    name: 'Jahresvorschau für das Schuljahr 2025/26',
  });
  await expect(rowOf(preview, 'Mathematik').getByRole('cell')).toHaveText(
    'Grenzfall2',
  );
  await expect(rowOf(preview, 'Deutsch').getByRole('cell')).toHaveText('2');
  await expect(
    preview.getByRole('rowheader', { name: 'Latein (archiviert)' }),
  ).toBeVisible();
  await expect(
    component.getByText('nicht bindend', { exact: false }),
  ).toBeVisible();
});

it('zeigt ohne Jahresvorschau keinen leeren Abschnitt', async ({ mount }) => {
  const component = await mount('features/zeugnis/ui/zeugnis-sheet/Punkte');
  await expect(component.getByRole('table')).toHaveCount(1);
  await expect(
    component.getByRole('heading', { name: jahresvorschau }),
  ).toHaveCount(0);
});

it('sagt, was fehlt, solange kein Fach eine Note hat', async ({ mount }) => {
  const component = await mount('features/zeugnis/ui/zeugnis-sheet/OhneNoten');
  await expect(
    component.getByRole('heading', { name: 'Noch keine Note in J1.1' }),
  ).toBeVisible();
  await expect(
    component.getByRole('link', { name: 'Note eintragen' }),
  ).toHaveAttribute('href', '/noten?halbjahr=j1-1&neu=true');
  await expect(component.getByRole('table')).toHaveCount(0);
});

it('führt zu den Fächern, solange das Schuljahr keine hat', async ({
  mount,
}) => {
  const component = await mount(
    'features/zeugnis/ui/zeugnis-sheet/OhneFaecher',
  );
  await expect(
    component.getByRole('heading', {
      name: 'Noch keine Fächer im Schuljahr 2026/27',
    }),
  ).toBeVisible();
  await expect(
    component.getByRole('link', { name: 'Fächer anlegen' }),
  ).toHaveAttribute('href', '/faecher');
});

it('passt auf dem Telefon ohne seitliches Scrollen', async ({
  mount,
  page,
}) => {
  await page.setViewportSize(fixture.phone);
  const component = await mount('features/zeugnis/ui/zeugnis-sheet/Sechser');
  const table = component.getByRole('table', {
    name: 'Halbjahresnoten in 10.2',
  });
  await expect(table.getByRole('columnheader', { name: 'Note' })).toBeVisible();
  await expect(table.getByRole('columnheader')).toHaveCount(
    fixture.phoneColumns,
  );
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

/** The numbers of WCAG's relative luminance and contrast ratio. */
const wcag = {
  byteMax: 255,
  linearBelow: 0.040_45,
  linearDivisor: 12.92,
  gammaOffset: 0.055,
  gammaDivisor: 1.055,
  gamma: 2.4,
  red: 0.2126,
  green: 0.7152,
  blue: 0.0722,
  flare: 0.05,
} as const;

/** WCAG's contrast between the fills of two elements, read as the browser draws them. */
const contrastOf = async (
  label: playwright.Locator,
  ground: playwright.Locator,
) =>
  label.evaluate(
    (text, { body, numbers }) => {
      const context = document.createElement('canvas').getContext('2d', {
        willReadFrequently: true,
      });
      if (context === null || body === null) {
        return 0;
      }
      const luminance = (element: Element): number => {
        // The canvas turns any colour notation into sRGB bytes.
        context.fillStyle = getComputedStyle(element).fill;
        context.fillRect(0, 0, 1, 1);
        const [red = 0, green = 0, blue = 0] = Array.from(
          context.getImageData(0, 0, 1, 1).data,
          (byte) => {
            const share = byte / numbers.byteMax;
            return share <= numbers.linearBelow
              ? share / numbers.linearDivisor
              : ((share + numbers.gammaOffset) / numbers.gammaDivisor) **
                  numbers.gamma;
          },
        );
        return numbers.red * red + numbers.green * green + numbers.blue * blue;
      };
      const [dark = 0, light = 0] = [luminance(text), luminance(body)].sort(
        (a, b) => a - b,
      );
      return (light + numbers.flare) / (dark + numbers.flare);
    },
    { body: await ground.elementHandle(), numbers: wcag },
  );

for (const colorScheme of ['light', 'dark'] as const) {
  it(`hält das Kürzel auf der hervorgehobenen Scheibe lesbar (${colorScheme})`, async ({
    mount,
    page,
  }) => {
    await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
    const component = await mount('features/zeugnis/ui/zeugnis-sheet/Punkte');
    const table = component.getByRole('table', {
      name: 'Halbjahresnoten in J1.1',
    });
    const disc = component.locator('[data-disc="deutsch"]');

    const body = disc.locator('[data-part="disc-body"]');
    const resting = await body.evaluate((node) => getComputedStyle(node).fill);

    await rowOf(table, 'Deutsch').hover();
    await expect(disc).toHaveAttribute('data-hover', '');
    // The colours ease into the highlight; the test reads them once they have arrived.
    await expect(body).not.toHaveCSS('fill', resting);
    await disc.evaluate((node) =>
      Promise.all(
        node
          .getAnimations({ subtree: true })
          .map((animation) => animation.finished),
      ),
    );
    expect(
      await contrastOf(disc.locator('[data-part="disc-text"]'), body),
    ).toBeGreaterThanOrEqual(fixture.minTextContrast);
  });
}
