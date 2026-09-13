import { expect, test as it } from '@playwright/experimental-ct-react';

import { UpcomingBlockStory } from './upcoming-block.ct-story.tsx';

/** Die Geschichte liefert drei bevorstehende Leistungen. */
const upcomingCount = 3;

it('zeigt die Leistungen in der gelieferten Reihenfolge mit Termin und Schnitt', async ({
  mount,
}) => {
  const component = await mount(<UpcomingBlockStory scenario="anstehend" />);
  const block = component.getByRole('region', { name: 'Anstehend' });
  const rows = block.getByRole('listitem');

  await expect(rows).toHaveCount(upcomingCount);
  await expect(rows.nth(0)).toContainText('Mathematik');
  await expect(rows.nth(0)).toContainText('Klausur · 19.09.2026 · in 6 Tagen');
  await expect(rows.nth(0)).toContainText('Schnitt 9 P.');
  await expect(rows.nth(0)).toContainText('2 von 7 Themen sicher');
  await expect(rows.nth(0)).toContainText(
    'zuletzt vor 4 Tagen gelernt · 1 von 7 Tagen',
  );
  await expect(rows.nth(1)).toContainText('noch nicht dafür gelernt');
  await expect(rows.nth(1)).toContainText('Test · 16.09.2026 · in 3 Tagen');
  await expect(rows.nth(1)).toContainText('keine Themen');
  await expect(rows.nth(2)).toContainText('GFS · 13.09.2026 · heute');
  await expect(rows.nth(2)).toContainText('noch kein Schnitt');
  await expect(
    rows.nth(0).getByRole('link', { name: 'Klausur Mathematik am 19.09.2026' }),
  ).toHaveAttribute('href', '/noten/mathe-klausur');
  await expect(block.getByText('fehlt noch')).toHaveCount(0);
});

it('fragt nach der fehlenden Note einer verstrichenen Leistung', async ({
  mount,
}) => {
  const component = await mount(
    <UpcomingBlockStory scenario="mit-ueberfaelligem" />,
  );
  const nag = component.getByRole('region', { name: 'Eine Note fehlt noch' });

  await expect(nag).toContainText('Physik');
  await expect(nag).toContainText('Klausur · 03.09.2026 · vor 10 Tagen');
  await expect(
    nag.getByRole('link', {
      name: 'Note eintragen: Klausur Physik am 03.09.2026',
    }),
  ).toHaveAttribute('href', '/noten/physik-klausur');
});

it('erklärt ohne Termine, wie eine Leistung hierher kommt', async ({
  mount,
}) => {
  const component = await mount(<UpcomingBlockStory scenario="leer" />);

  await expect(component.getByText('Nichts angekündigt.')).toBeVisible();
  await expect(component.getByRole('link', { name: 'Noten' })).toHaveAttribute(
    'href',
    '/noten',
  );
});
