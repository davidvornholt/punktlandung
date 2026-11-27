import { expect, test as it } from '@playwright/test';

import {
  cancel,
  chooseNote,
  entryForm,
  firstRow,
  noteValue,
  openEditor,
  save,
  secondRow,
  settle,
} from './noten-list.story-locators.ts';

/**
 * Die Liste teilt sich eine Änderungsmutation über alle Zeilen. Ohne die
 * Kennung der gescheiterten Note trüge die zweite Zeile den Fehler der ersten,
 * und die erste bliebe stillschweigend ungeändert.
 */
it('hält den Fehler bei der gescheiterten Note und nimmt ihn beim erneuten Öffnen zurück', async ({
  mount,
}) => {
  const component = await mount('features/noten/ui/noten-list/Standard');
  await openEditor(firstRow(component));
  await save(component);
  await settle(component, 'fail');

  await expect(entryForm(component).getByRole('alert')).toContainText(
    'konnte nicht geändert werden',
  );
  await cancel(component);
  await expect(firstRow(component).getByRole('alert')).toContainText(
    'Öffne sie erneut zum Bearbeiten',
  );
  await expect(secondRow(component).getByRole('alert')).toHaveCount(0);

  await openEditor(firstRow(component));
  await expect(component.getByRole('alert')).toHaveCount(0);
});

/**
 * Der Eintrag gehört einer einzigen Note. Trüge er irgendeinen Fehler der
 * Liste, meldete er dem Benutzer beim Öffnen einer anderen Note, deren
 * Änderung sei nicht angekommen, obwohl er sie noch gar nicht gespeichert hat.
 */
it('zeigt im Eintrag einer anderen Note deren eigenen Stand', async ({
  mount,
}) => {
  const component = await mount('features/noten/ui/noten-list/Standard');
  await openEditor(firstRow(component));
  await save(component);
  await settle(component, 'fail');
  await cancel(component);
  await expect(firstRow(component).getByRole('alert')).toBeVisible();

  await openEditor(secondRow(component));

  await expect(entryForm(component).getByRole('alert')).toHaveCount(0);
  await cancel(component);
  await expect(firstRow(component).getByRole('alert')).toBeVisible();
});

/**
 * Der Fehler gehört dem letzten Versuch, nicht der Note. Bliebe er nach einem
 * geglückten zweiten Versuch stehen, behauptete die Zeile weiter, die Änderung
 * sei nicht angekommen, und riete zu einer Korrektur, die längst gespeichert
 * ist.
 */
it('nimmt den Fehler zurück, sobald dieselbe Note erneut gespeichert wird', async ({
  mount,
}) => {
  const component = await mount('features/noten/ui/noten-list/Standard');
  await openEditor(firstRow(component));
  await chooseNote(component, 'Note 1');
  await save(component);
  await settle(component, 'fail');
  await expect(entryForm(component).getByRole('alert')).toBeVisible();

  await save(component);
  await settle(component, 'complete');

  await expect(noteValue(firstRow(component))).toHaveText('1');
  await expect(component.getByRole('alert')).toHaveCount(0);
});
