import { expect, test as it } from '@playwright/test';

/** The story holds three Leistungen that are still to be written. */
const upcomingCount = 3;

it('reiht die Leistungen nach ihrem Termin und führt zu jeder', async ({
  mount,
}) => {
  const component = await mount('features/noten/ui/anstehend-rail/Anstehend');
  const block = component.getByRole('region', { name: 'Anstehend' });
  const rows = block.getByRole('listitem');

  await expect(rows).toHaveCount(upcomingCount);
  await expect(rows.nth(0)).toContainText('Deutsch GFS');
  await expect(rows.nth(0)).toContainText('So 13.09. · zählt 50 %');
  await expect(rows.nth(0)).toContainText('heute');
  await expect(rows.nth(1)).toContainText('Englisch Test · Vokabeln');
  await expect(rows.nth(1)).toContainText('in 3 Tagen');
  await expect(rows.nth(2)).toContainText('Mathematik Klausur · Analysis');
  await expect(
    block.getByRole('link', {
      name: 'Mathematik Klausur · Analysis Sa 19.09. · zählt 33 % in 6 Tagen',
    }),
  ).toHaveAttribute('href', '/noten/mathe-klausur');
  await expect(block.getByText('Note fehlt noch')).toHaveCount(0);
});

it('stellt eine Leistung ohne Note über heute und führt zum Eintragen', async ({
  mount,
}) => {
  const component = await mount(
    'features/noten/ui/anstehend-rail/MitFehlenderNote',
  );
  const block = component.getByRole('region', { name: 'Anstehend' });
  const missing = block.getByRole('link', {
    name: 'Note eintragen: Physik Klausur Do 03.09. · zählt 40 % Note fehlt noch seit 10 Tagen',
  });

  await expect(missing).toHaveAttribute(
    'href',
    '/noten/physik-klausur?eintragen=true',
  );
  await expect(missing).toContainText('Note fehlt noch');
  await expect(missing).toContainText('seit 10 Tagen');
  await expect(block.getByRole('listitem').first()).toContainText('Physik');

  const missingBox = await missing.boundingBox();
  const todayBox = await block
    .getByRole('link', { name: 'Deutsch GFS So 13.09. · zählt 50 % heute' })
    .boundingBox();
  expect(missingBox?.y ?? 0).toBeLessThan(todayBox?.y ?? 0);
});

it('erklärt ohne Termine, wie eine Leistung hierher kommt', async ({
  mount,
}) => {
  const component = await mount('features/noten/ui/anstehend-rail/Leer');

  await expect(component.getByText('Nichts angekündigt.')).toBeVisible();
  await expect(component.getByRole('link', { name: 'Noten' })).toHaveAttribute(
    'href',
    '/noten',
  );
});

it('lädt nach einem Fehler neu und gibt den Fokus an den Abschnitt', async ({
  mount,
}) => {
  const component = await mount(
    'features/noten/ui/anstehend-rail/LadenScheitert',
  );
  const block = component.getByRole('region', { name: 'Anstehend' });

  await expect(block.getByRole('alert')).toContainText(
    'Die anstehenden Leistungen konnten nicht geladen werden.',
  );
  await block.getByRole('button', { name: 'Erneut versuchen' }).click();
  await expect(block.getByRole('listitem')).toHaveCount(upcomingCount);
  await expect(block.getByRole('alert')).toHaveCount(0);
  await expect(block).toBeFocused();
});
