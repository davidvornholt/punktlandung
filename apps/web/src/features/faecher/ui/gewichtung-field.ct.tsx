import { expect, test as it } from '@playwright/experimental-ct-react';

import { GewichtungFieldStory } from './gewichtung-field.ct-story.tsx';

const listeErklaerung = /ergibt sich aus der Zahl der Noten/u;
const verhaeltnisErklaerung = /egal, wie viele Noten es jeweils gibt/u;

it('erklärt beide Aufteilungen als Beschreibung ihres Radiofelds', async ({
  mount,
}) => {
  const component = await mount(<GewichtungFieldStory />);
  const liste = component.getByRole('radio', {
    name: 'Alle Noten in einer Liste',
  });
  const verhaeltnis = component.getByRole('radio', {
    name: 'Festes Verhältnis schriftlich : mündlich',
  });

  await expect(liste).toBeChecked();
  await expect(liste).toHaveAccessibleDescription(listeErklaerung);
  await expect(verhaeltnis).toHaveAccessibleDescription(verhaeltnisErklaerung);
  await expect(component.getByLabel('Schriftlicher Anteil')).toHaveCount(0);
});

it('zeigt die Anteile erst unter dem gewählten Verhältnis', async ({
  mount,
}) => {
  const component = await mount(<GewichtungFieldStory />);

  await component
    .getByRole('radio', { name: 'Festes Verhältnis schriftlich : mündlich' })
    .check();

  await expect(component.getByLabel('Schriftlicher Anteil')).toHaveValue('1');
  await expect(component.getByLabel('Mündlicher Anteil')).toHaveValue('1');
  await component.getByRole('button', { name: '60:40' }).click();
  await expect(component.getByLabel('Schriftlicher Anteil')).toHaveValue('60');
  await expect(component.getByText('≙ 60 % : 40 %')).toBeVisible();
  await expect(component.getByText('Schriftlich · 60 %')).toBeVisible();
});
