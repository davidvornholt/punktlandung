import { expect, test as it } from '@playwright/test';

const story = (name: string): string =>
  `features/zeugnis/ui/zeugnisblatt/${name}`;

it('sagt, dass das Zeugnis berechnet wird, solange keine Antwort da ist', async ({
  mount,
}) => {
  const component = await mount(story('Laedt'));
  const blatt = component.getByRole('region', { name: 'Zeugnisvorschau' });

  await expect(blatt.getByRole('status')).toHaveText(
    'Zeugnis wird berechnet …',
  );
  await expect(blatt.getByRole('table')).toHaveCount(0);
});

it('bietet nach einem Fehler einen neuen Versuch an und nimmt danach den Fokus', async ({
  mount,
}) => {
  const component = await mount(story('ScheitertUndErholtSich'));
  const blatt = component.getByRole('region', { name: 'Zeugnisvorschau' });

  await expect(blatt.getByRole('alert')).toContainText(
    'Das Zeugnis konnte nicht berechnet werden.',
  );
  await blatt.getByRole('button', { name: 'Erneut versuchen' }).click();

  await expect(
    blatt.getByRole('table', { name: 'Halbjahresnoten in J1.1' }),
  ).toBeVisible();
  await expect(blatt.getByRole('alert')).toHaveCount(0);
  // Der Knopf ist mit dem Hinweis verschwunden; der Fokus fällt nicht an den Seitenanfang.
  await expect(blatt).toBeFocused();
});

it('behält die letzte Vorschau, wenn nur das Aktualisieren scheitert', async ({
  mount,
}) => {
  const component = await mount(story('AktualisierenScheitert'));
  const blatt = component.getByRole('region', { name: 'Zeugnisvorschau' });
  const table = blatt.getByRole('table', { name: 'Halbjahresnoten in J1.1' });

  await expect(table).toBeVisible();
  await component.getByRole('button', { name: 'Neu laden' }).click();
  await expect(blatt.getByRole('alert')).toContainText(
    'Das Zeugnis konnte nicht aktualisiert werden. Angezeigt wird die zuletzt berechnete Vorschau',
  );
  await expect(table).toBeVisible();

  await blatt.getByRole('button', { name: 'Erneut versuchen' }).click();
  await expect(blatt.getByRole('alert')).toHaveCount(0);
  await expect(table).toBeVisible();
  await expect(blatt).toBeFocused();
});

it('lässt beim Wechsel des Halbjahrs das alte Blatt stehen, bis das neue da ist', async ({
  mount,
}) => {
  const component = await mount(story('HalbjahrWechsel'));
  const blatt = component.getByRole('region', { name: 'Zeugnisvorschau' });
  const table = blatt.getByRole('table', { name: 'Halbjahresnoten in J1.1' });

  await expect(table).toBeVisible();
  await expect(blatt).toHaveAttribute('aria-busy', 'false');
  await component.getByRole('button', { name: 'Anderes Halbjahr' }).click();

  await expect(blatt).toHaveAttribute('aria-busy', 'true');
  await expect(blatt.getByRole('status')).toHaveText(
    'Zeugnis wird berechnet …',
  );
  await expect(table).toBeVisible();
});
