import { expect, test as it } from '@playwright/test';

const listeErklaerung = /ergibt sich aus der Zahl der Noten/u;
const verhaeltnisErklaerung = /egal, wie viele Noten es jeweils gibt/u;
const schnittStandard = /Schnitt 10,78 P\./u;
const schnittVerhaeltnis = /Schnitt 11,1 P\./u;
const testZeile = /Test/u;

it('erklärt beide Aufteilungen als Beschreibung ihres Radiofelds', async ({
  mount,
}) => {
  const component = await mount(
    'features/faecher/ui/gewichtung-field/Standardgewichtung',
  );
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
  const component = await mount(
    'features/faecher/ui/gewichtung-field/Standardgewichtung',
  );

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

it('rechnet das Beispiel mit der eingestellten Gewichtung', async ({
  mount,
}) => {
  const component = await mount(
    'features/faecher/ui/gewichtung-field/Standardgewichtung',
  );
  const example = component.getByRole('region', { name: 'Rechenbeispiel' });
  await expect(
    example.getByRole('img', { name: schnittStandard }),
  ).toBeVisible();
  await expect(example.getByRole('row', { name: testZeile })).toContainText(
    'zusammen 17 %',
  );

  await component
    .getByRole('radio', { name: 'Festes Verhältnis schriftlich : mündlich' })
    .check();
  await component.getByRole('button', { name: '60:40' }).click();
  await component
    .getByRole('radio', { name: 'Jeder Test zählt einzeln' })
    .check();

  await expect(
    example.getByRole('img', { name: schnittVerhaeltnis }),
  ).toBeVisible();
  await expect(example.getByRole('row', { name: testZeile })).toContainText(
    'je 10 %',
  );
  await expect(example).toContainText(
    'Schriftlich 9,5 P. (60 %) · mündlich 13,5 P. (40 %)',
  );
});

it('zeigt die Note des Beispiels, auf die der Zeiger weist, auch auf dem Lineal', async ({
  mount,
}) => {
  const component = await mount(
    'features/faecher/ui/gewichtung-field/Standardgewichtung',
  );
  const example = component.getByRole('region', { name: 'Rechenbeispiel' });
  const note = example.getByText('12 P.', { exact: true });
  await expect(note).not.toHaveAttribute('data-marked');
  await note.hover();
  await expect(note).toHaveAttribute('data-marked');
  await expect(example.locator('[data-part="disc"][data-hover]')).toHaveCount(
    1,
  );
});
