import { expect, test as it } from '@playwright/experimental-ct-react';

import {
  editForm,
  firstRow,
  firstRowDatum,
  noteField,
  noteValue,
  openEditor,
  save,
  secondRow,
  settle,
} from './noten-list.ct-locators.ts';
import { NotenListStory } from './noten-list.ct-story.tsx';

it('speichert die Änderung unter der Kennung der bearbeiteten Note', async ({
  mount,
}) => {
  const component = await mount(<NotenListStory />);
  await openEditor(firstRow(component));
  await noteField(component).fill('1');
  await save(component);
  await settle(component, 'complete');

  await expect(editForm(component)).toHaveCount(0);
  await expect(noteValue(firstRow(component))).toHaveText('1');
  await expect(noteValue(secondRow(component))).toHaveText('3');
});

/**
 * Das Fach der Note kommt aus dem Auswahlfeld. Nach dem Wechsel steht die Note
 * unter dem neuen Fach — und ihr Zeilenknopf verschwindet mit der alten Zeile,
 * weshalb der Fokus ohne das Auffangziel der Liste auf <body> fiele.
 */
it('trägt eine Note in das gewählte Fach um', async ({ mount }) => {
  const component = await mount(<NotenListStory />);
  await openEditor(firstRow(component));
  await editForm(component)
    .getByRole('combobox', { name: 'Fach' })
    .selectOption('mathe');
  await save(component);
  await settle(component, 'complete');

  await expect(
    component.getByRole('region', { name: 'Mathematik' }),
  ).toContainText(firstRowDatum);
  await expect(
    component.getByRole('region', { name: 'Latein' }),
  ).not.toContainText(firstRowDatum);
  await expect(
    component.getByRole('region', { name: 'Notenliste' }),
  ).toBeFocused();
});

/**
 * Der Zeilenknopf hat das Formular geöffnet; nach dem Schließen gehört der
 * Fokus dorthin zurück, sonst begänne die Tastaturbedienung wieder ganz oben.
 */
it('gibt den Fokus nach dem Abbrechen an den Zeilenknopf zurück', async ({
  mount,
}) => {
  const component = await mount(<NotenListStory />);
  const row = secondRow(component);
  await openEditor(row);
  await editForm(component).getByRole('button', { name: 'Abbrechen' }).click();

  await expect(editForm(component)).toHaveCount(0);
  await expect(row.getByRole('button', { name: 'Bearbeiten' })).toBeFocused();
});

/**
 * Sind alle Fächer des Schuljahrs archiviert, liefert die Fächerliste nichts
 * mehr — die Noten hängen aber weiter an ihnen. Verschwände die Notenliste mit
 * der Fächerliste, wäre genau dann keine Note mehr korrigierbar.
 */
it('lässt eine Note auch dann korrigieren, wenn kein Fach mehr wählbar ist', async ({
  mount,
}) => {
  const component = await mount(<NotenListStory scenario="ohne-fach" />);
  await expect(
    component.getByRole('form', { name: 'Note eintragen' }),
  ).toHaveCount(0);

  await openEditor(firstRow(component));

  await expect(
    editForm(component).getByRole('combobox', { name: 'Fach' }),
  ).toHaveValue('latein');
  await expect(editForm(component)).toContainText('Latein (archiviert)');
});

/**
 * Mit der gelöschten Zeile verschwindet ihr Löschknopf. Ohne das Auffangziel
 * der Liste fiele der Fokus auf <body>.
 */
it('gibt den Fokus nach dem Löschen an die Notenliste', async ({ mount }) => {
  const component = await mount(<NotenListStory />);
  await firstRow(component).getByRole('button', { name: 'Löschen' }).click();
  await settle(component, 'complete');

  await expect(firstRow(component)).toHaveCount(0);
  await expect(
    component.getByRole('region', { name: 'Notenliste' }),
  ).toBeFocused();
});

/**
 * Bis die Änderung durch ist, kann längst eine andere Note offen sein: die darf
 * weder als beschäftigt gelten noch vom Nachlauf der ersten zugeklappt werden.
 */
it('meldet nur die gespeicherte Note als beschäftigt und lässt die andere offen', async ({
  mount,
}) => {
  const component = await mount(<NotenListStory />);
  await openEditor(firstRow(component));
  await noteField(component).fill('1');
  await save(component);
  await expect(
    editForm(component).getByRole('button', {
      name: 'Note wird gespeichert …',
    }),
  ).toBeDisabled();
  await expect(
    editForm(component).getByRole('button', { name: 'Abbrechen' }),
  ).toBeDisabled();

  await openEditor(secondRow(component));
  await expect(
    editForm(component).getByRole('button', { name: 'Note speichern' }),
  ).toBeEnabled();
  await noteField(component).fill('4');

  await settle(component, 'complete');
  /*
   * Der Nachlauf der ersten Note ist erst durch, wenn ihr neuer Wert in der
   * Liste steht; vorher sähe jede Zusicherung noch den alten Zustand.
   */
  await expect(noteValue(firstRow(component))).toHaveText('1');
  await expect(noteField(component)).toHaveValue('4');
  await expect(secondRow(component).locator('form')).toHaveCount(1);
});

/**
 * Auch die letzte Note lässt sich löschen. Trüge das Auffangziel nur die
 * gefüllte Liste, verschwände es genau mit der letzten Zeile und der Fokus
 * fiele auf <body>.
 */
it('hält den Fokus, wenn die letzte Note gelöscht wird', async ({ mount }) => {
  const component = await mount(<NotenListStory scenario="letzte-note" />);
  await firstRow(component).getByRole('button', { name: 'Löschen' }).click();
  await settle(component, 'complete');

  const liste = component.getByRole('region', { name: 'Notenliste' });
  await expect(liste).toContainText('noch keine Noten eingetragen');
  await expect(liste).toBeFocused();
});

/**
 * Ohne wählbares Fach steht keine Eintragsleiste über der Liste. Der leere
 * Hinweis darf dann nicht auf sie verweisen, sonst sucht der Benutzer ein Feld,
 * das gar nicht dasteht.
 */
it('verweist ohne wählbares Fach nicht auf die Eintragsleiste', async ({
  mount,
}) => {
  const component = await mount(
    <NotenListStory scenario="ohne-fach-ohne-note" />,
  );

  const liste = component.getByRole('region', { name: 'Notenliste' });
  await expect(liste).toContainText('noch keine Noten eingetragen');
  await expect(liste).not.toContainText('Eintragsleiste');
});
