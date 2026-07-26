import { expect, test as it } from '@playwright/experimental-ct-react';

import {
  cancel,
  editForm,
  firstRow,
  noteField,
  noteValue,
  openEditor,
  save,
  secondRow,
  settle,
} from './noten-list.ct-locators.ts';
import { NotenListStory } from './noten-list.ct-story.tsx';

/**
 * Die Liste teilt sich eine Änderungsmutation über alle Zeilen. Ohne die
 * Kennung der gescheiterten Note trüge die zweite Zeile den Fehler der ersten,
 * und die erste bliebe stillschweigend ungeändert.
 */
it('hält den Fehler bei der gescheiterten Note und nimmt ihn beim erneuten Öffnen zurück', async ({
  mount,
}) => {
  const component = await mount(<NotenListStory />);
  await openEditor(firstRow(component));
  await save(component);
  await settle(component, 'fail');

  await expect(editForm(component).getByRole('alert')).toContainText(
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
 * Das Formular gehört einer einzigen Note. Trüge es irgendeinen Fehler der
 * Karte, meldete es dem Benutzer beim Öffnen einer anderen Note, deren
 * Änderung sei nicht angekommen — obwohl er sie noch gar nicht gespeichert hat.
 */
it('zeigt im Formular einer anderen Note deren eigenen Stand', async ({
  mount,
}) => {
  const component = await mount(<NotenListStory />);
  await openEditor(firstRow(component));
  await save(component);
  await settle(component, 'fail');
  await cancel(component);
  await expect(firstRow(component).getByRole('alert')).toBeVisible();

  await openEditor(secondRow(component));

  await expect(editForm(component).getByRole('alert')).toHaveCount(0);
  await expect(firstRow(component).getByRole('alert')).toBeVisible();
});

/**
 * Der Fehler gehört dem letzten Versuch, nicht der Note. Bliebe er nach einem
 * geglückten zweiten Versuch stehen, behauptete die Zeile weiter, die Änderung
 * sei nicht angekommen — und riete zu einer Korrektur, die längst gespeichert
 * ist.
 */
it('nimmt den Fehler zurück, sobald dieselbe Note erneut gespeichert wird', async ({
  mount,
}) => {
  const component = await mount(<NotenListStory />);
  await openEditor(firstRow(component));
  await noteField(component).fill('1');
  await save(component);
  await settle(component, 'fail');
  await expect(editForm(component).getByRole('alert')).toBeVisible();

  await save(component);
  await settle(component, 'complete');

  await expect(noteValue(firstRow(component))).toHaveText('1');
  await expect(component.getByRole('alert')).toHaveCount(0);
});
