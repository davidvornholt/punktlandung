import { expect, test as it } from '@playwright/test';

import {
  cancel,
  chooseNote,
  chooser,
  deleteRow,
  editButton,
  entryForm,
  fach,
  fachHeading,
  firstRow,
  firstRowDatum,
  list,
  noteOnBar,
  noteValue,
  openEditor,
  otherFachRow,
  pickFach,
  save,
  saveButton,
  secondRow,
  settle,
  trashButton,
} from './noten-list.story-locators.ts';

it('speichert die Änderung unter der Kennung der bearbeiteten Note', async ({
  mount,
}) => {
  const component = await mount('features/noten/ui/noten-list/Standard');
  await openEditor(firstRow(component));
  await expect(entryForm(component)).toContainText('Klausur ändern');
  await chooseNote(component, 'Note 1');
  await save(component);
  await settle(component, 'complete');

  await expect(entryForm(component)).toHaveCount(0);
  await expect(noteValue(firstRow(component))).toHaveText('1');
  await expect(noteValue(secondRow(component))).toHaveText('3');
  await expect(list(component).getByRole('status')).toHaveText(
    'Gespeichert: Latein, Klausur vom 14.09.2026, 1.',
  );
});

/**
 * Das Fach einer Note wechselt über „Anderes Fach“. Nach dem Speichern steht
 * die Note unter dem neuen Fach, und ihr Zeilenknopf ist mit der alten Zeile
 * verschwunden: der Fokus folgt ihr deshalb in die neue Zeile, statt auf
 * <body> zu fallen.
 */
it('trägt eine Note in das gewählte Fach um', async ({ mount }) => {
  const component = await mount('features/noten/ui/noten-list/Standard');
  await openEditor(firstRow(component));
  await entryForm(component)
    .getByRole('button', { name: 'Anderes Fach' })
    .click();
  await expect(chooser(component)).toContainText(
    'Klausur verschieben: in welches Fach?',
  );
  await pickFach(component, 'Mathematik');
  const mathematik = fach(component, 'Mathematik');
  await expect(mathematik.locator('form[data-note-entry]')).toContainText(
    'Klausur ändern',
  );
  await save(component);
  await settle(component, 'complete');

  await expect(entryForm(component)).toHaveCount(0);
  await expect(mathematik).toContainText(firstRowDatum);
  await expect(fach(component, 'Latein')).not.toContainText(firstRowDatum);
  await expect(
    firstRow(component).locator('[data-leistung-link]'),
  ).toBeFocused();
});

/**
 * Wer die Wahl des Fachs aufgibt, steht wieder im Eintrag, aus dem er kam, mit
 * allem, was dort schon gewählt war.
 */
it('kehrt nach der abgebrochenen Fachwahl mit der Eingabe in den Eintrag zurück', async ({
  mount,
  page,
}) => {
  const component = await mount('features/noten/ui/noten-list/Standard');
  await openEditor(firstRow(component));
  await chooseNote(component, 'Note 1');
  await entryForm(component)
    .getByRole('button', { name: 'Anderes Fach' })
    .click();
  await expect(chooser(component)).toBeVisible();
  await page.keyboard.press('Escape');

  await expect(chooser(component)).toHaveCount(0);
  await expect(
    fach(component, 'Latein').locator('form[data-note-entry]'),
  ).toHaveCount(1);
  await expect(noteOnBar(component, 'Note 1')).toBeChecked();
});

/**
 * Der Zeilenknopf hat den Eintrag geöffnet; nach dem Schließen gehört der
 * Fokus dorthin zurück, sonst begänne die Tastaturbedienung wieder ganz oben.
 */
it('gibt den Fokus nach dem Abbrechen an den Zeilenknopf zurück', async ({
  mount,
}) => {
  const component = await mount('features/noten/ui/noten-list/Standard');
  const row = secondRow(component);
  await openEditor(row);
  await cancel(component);

  await expect(entryForm(component)).toHaveCount(0);
  await expect(editButton(row)).toBeFocused();
});

it('schließt den Eintrag mit Escape, ohne etwas zu ändern', async ({
  mount,
  page,
}) => {
  const component = await mount('features/noten/ui/noten-list/Standard');
  const row = secondRow(component);
  await openEditor(row);
  await chooseNote(component, 'Note 1');
  await page.keyboard.press('Escape');

  await expect(entryForm(component)).toHaveCount(0);
  await expect(noteValue(row)).toHaveText('3');
  await expect(editButton(row)).toBeFocused();
});

/**
 * Sind alle Fächer des Schuljahrs archiviert, liefert die Fächerliste nichts
 * mehr, die Noten hängen aber weiter an ihnen. Ihr Abschnitt bleibt deshalb
 * stehen und ihre Noten bleiben korrigierbar; nur eine neue Note oder ein
 * anderes Fach gibt es dort nicht.
 */
it('lässt eine Note auch dann korrigieren, wenn kein Fach mehr wählbar ist', async ({
  mount,
}) => {
  const component = await mount('features/noten/ui/noten-list/OhneFach');
  const latein = fach(component, 'Latein');
  await expect(latein).toContainText('Archiviert');
  await expect(
    latein.getByRole('button', { name: 'Note eintragen', exact: true }),
  ).toHaveCount(0);

  await openEditor(firstRow(component));
  await expect(entryForm(component)).toContainText('Klausur ändern');
  await expect(
    entryForm(component).getByRole('button', { name: 'Anderes Fach' }),
  ).toHaveCount(0);
  await chooseNote(component, 'Note 1');
  await save(component);
  await settle(component, 'complete');

  await expect(noteValue(firstRow(component))).toHaveText('1');
});

/**
 * Mit der gelöschten Zeile verschwindet ihr Löschknopf. Ohne ein Auffangziel
 * fiele der Fokus auf <body>; er geht an die Überschrift des Fachs, in dem die
 * Note stand.
 */
it('gibt den Fokus nach dem Löschen an die Überschrift des Fachs', async ({
  mount,
}) => {
  const component = await mount('features/noten/ui/noten-list/Standard');
  await deleteRow(firstRow(component));
  await expect(firstRow(component)).toHaveAttribute('aria-busy', 'true');
  await settle(component, 'complete');

  await expect(firstRow(component)).toHaveCount(0);
  await expect(fachHeading(component, 'Latein')).toBeFocused();
  await expect(list(component).getByRole('status')).toHaveText(
    'Gelöscht: Latein, Klausur vom 14.09.2026.',
  );
});

/** Gefragt wird in der Zeile selbst; wer die Note behält, steht wieder auf dem Löschknopf. */
it('fragt vor dem Löschen nach und behält die Note auf Wunsch', async ({
  mount,
}) => {
  const component = await mount('features/noten/ui/noten-list/Standard');
  const row = firstRow(component);
  const trash = trashButton(row);
  await trash.click();
  await expect(row).toContainText('Klausur vom 14.09. löschen?');
  const keep = row.getByRole('button', { name: 'Behalten' });
  await expect(keep).toBeFocused();
  // Wer mit der Tastatur dort landet, hört, was gelöscht würde.
  await expect(keep).toHaveAccessibleDescription('Klausur vom 14.09. löschen?');
  await keep.click();

  await expect(noteValue(row)).toHaveText('2');
  await expect(trash).toBeFocused();
});

/**
 * Bis die Änderung durch ist, kann längst eine andere Note offen sein: die darf
 * weder als beschäftigt gelten noch vom Nachlauf der ersten zugeklappt werden.
 */
it('meldet nur die gespeicherte Note als beschäftigt und lässt die andere offen', async ({
  mount,
}) => {
  const component = await mount('features/noten/ui/noten-list/Standard');
  await openEditor(firstRow(component));
  await chooseNote(component, 'Note 1');
  await save(component);
  await expect(
    entryForm(component).getByRole('button', { name: 'Wird gespeichert …' }),
  ).toHaveAttribute('aria-disabled', 'true');
  await expect(
    entryForm(component).getByRole('button', { name: 'Abbrechen' }),
  ).toBeDisabled();

  await openEditor(otherFachRow(component));
  await expect(saveButton(component)).toHaveAttribute('aria-disabled', 'false');
  await chooseNote(component, 'Note 4');

  await settle(component, 'complete');
  /*
   * Der Nachlauf der ersten Note ist erst durch, wenn ihr neuer Wert in der
   * Liste steht; vorher sähe jede Zusicherung noch den alten Zustand.
   */
  await expect(noteValue(firstRow(component))).toHaveText('1');
  await expect(noteOnBar(component, 'Note 4')).toBeChecked();
  await expect(
    fach(component, 'Mathematik').locator('form[data-note-entry]'),
  ).toHaveCount(1);
});

/**
 * Auch die letzte Note eines Fachs lässt sich löschen. Das Fach bleibt mit
 * leerer Skala stehen und seine Überschrift nimmt den Fokus.
 */
it('hält den Fokus, wenn die letzte Note eines Fachs gelöscht wird', async ({
  mount,
}) => {
  const component = await mount('features/noten/ui/noten-list/LetzteNote');
  await deleteRow(firstRow(component));
  await settle(component, 'complete');

  await expect(fach(component, 'Latein')).toContainText(
    'Noch keine Note in Latein.',
  );
  await expect(fachHeading(component, 'Latein')).toBeFocused();
});

/**
 * Ein archiviertes Fach verschwindet mit seiner letzten Note von der Seite.
 * Trüge das Auffangziel nur die gefüllte Liste, verschwände es genau dann mit
 * und der Fokus fiele auf <body>.
 */
it('hält den Fokus, wenn mit der letzten Note auch das Fach verschwindet', async ({
  mount,
}) => {
  const component = await mount(
    'features/noten/ui/noten-list/OhneFachLetzteNote',
  );
  await deleteRow(firstRow(component));
  await settle(component, 'complete');

  await expect(fach(component, 'Latein')).toHaveCount(0);
  await expect(list(component)).toBeFocused();
});

/** Ein Fach ohne Note steht mit leerer Skala da und sagt, dass noch nichts eingetragen ist. */
it('zeigt ein Fach ohne Note mit leerer Skala', async ({ mount }) => {
  const component = await mount('features/noten/ui/noten-list/Standard');
  const kunst = fach(component, 'Kunst');

  await expect(kunst).toContainText('Noch keine Note in Kunst.');
  await expect(kunst.locator('[data-part="disc"]')).toHaveCount(0);
  await expect(
    kunst.getByRole('button', { name: 'Note eintragen', exact: true }),
  ).toBeVisible();
});
