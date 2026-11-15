import { expect, test as it } from '@playwright/test';
import type { MitThemen } from './leistung-detail.story.tsx';
import { themen } from './leistung-detail.story-fixtures.ts';

/** Was ein anderer Tab speichert, während diese Seite den alten Stand zeigt. */
const themenAusAnderemTab = themen.replace(
  '- [x] Ableitungsregeln',
  '- [x] Ableitungsregeln\n- [ ] Kurvendiskussion',
);
const geaendertText =
  'Die Vorbereitung wurde inzwischen an anderer Stelle geändert';

it('überschreibt mit einem Haken nicht, was ein anderer Tab gespeichert hat', async ({
  mount,
  page,
}) => {
  const component = await mount<typeof MitThemen>(
    'features/noten/ui/leistung-detail/MitThemen',
    { savedElsewhere: themenAusAnderemTab },
  );
  const saved = page
    .getByRole('list', {
      includeHidden: true,
      name: 'Gespeicherte Vorbereitungen',
    })
    .getByRole('listitem', { includeHidden: true });
  await expect(component.getByText('1 von 2 Themen sicher')).toBeVisible();

  await component
    .getByRole('checkbox', { name: 'Thema offen: Integralrechnung' })
    .click();

  await expect(component.getByRole('alert')).toContainText(geaendertText);
  await expect(saved).toHaveCount(0);
  // Die Seite lädt den neuen Stand nach; der Haken gelingt jetzt darauf.
  await expect(
    component.getByRole('checkbox', { name: 'Thema offen: Kurvendiskussion' }),
  ).toBeVisible();
  await component
    .getByRole('checkbox', { name: 'Thema offen: Integralrechnung' })
    .click();
  await expect(saved).toHaveText([
    themenAusAnderemTab.replace(
      '- [ ] Integralrechnung',
      '- [x] Integralrechnung',
    ),
  ]);
  await expect(component.getByRole('alert')).toHaveCount(0);
});

it('behält einen Entwurf, wenn ein anderer Tab inzwischen gespeichert hat', async ({
  mount,
  page,
}) => {
  const component = await mount<typeof MitThemen>(
    'features/noten/ui/leistung-detail/MitThemen',
    { savedElsewhere: themenAusAnderemTab },
  );
  await expect(component.getByText('1 von 2 Themen sicher')).toBeVisible();
  await component.getByRole('button', { name: 'Text bearbeiten' }).click();
  const editor = component.getByRole('textbox', {
    name: 'Vorbereitung als Markdown',
  });
  await editor.fill(`${themen}\n- [ ] Stammfunktionen`);
  await component.getByRole('button', { name: 'Speichern' }).click();

  await expect(component.getByRole('alert')).toContainText(geaendertText);
  await expect(editor).toHaveValue(`${themen}\n- [ ] Stammfunktionen`);
  await expect(
    page
      .getByRole('list', {
        includeHidden: true,
        name: 'Gespeicherte Vorbereitungen',
      })
      .getByRole('listitem', { includeHidden: true }),
  ).toHaveCount(0);

  await component.getByRole('button', { name: 'Abbrechen' }).click();
  await expect(
    component.getByRole('checkbox', { name: 'Thema offen: Kurvendiskussion' }),
  ).toBeVisible();
});

it('behält einen Entwurf, wenn ein anderer Tab die Vorbereitung gelöscht hat', async ({
  mount,
  page,
}) => {
  const component = await mount<typeof MitThemen>(
    'features/noten/ui/leistung-detail/MitThemen',
    { savedElsewhere: null },
  );
  await expect(component.getByText('1 von 2 Themen sicher')).toBeVisible();
  await component.getByRole('button', { name: 'Text bearbeiten' }).click();
  const editor = component.getByRole('textbox', {
    name: 'Vorbereitung als Markdown',
  });
  await editor.fill(`${themen}\n- [ ] Stammfunktionen`);
  await component.getByRole('button', { name: 'Speichern' }).click();

  await expect(component.getByRole('alert')).toContainText(geaendertText);
  // Erst nach dem Neuladen zeigt sich, ob der Editor den Entwurf hält.
  await expect(
    page.getByRole('status', { includeHidden: true, name: 'Ladevorgänge' }),
  ).toHaveText('2');
  await expect(editor).toHaveValue(`${themen}\n- [ ] Stammfunktionen`);

  await component.getByRole('button', { name: 'Abbrechen' }).click();
  await expect(component.getByText('Noch keine Vorbereitung.')).toBeVisible();
});
