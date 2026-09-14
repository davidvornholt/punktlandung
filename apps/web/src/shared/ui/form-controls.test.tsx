import { describe, expect, it } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { Checkbox, Radio } from './form-controls.tsx';

const describedByPattern = /aria-describedby="(?<id>[^"]+)"/u;

/**
 * Die Felder zeichnen sich selbst, bleiben aber native Inputs im Label. Genau
 * das prüfen diese Tests: Der Lint-Regel für Label und Bedienelement ist die
 * Verschachtelung hinter der Komponente verborgen.
 */
describe('Auswahlfelder', () => {
  it('legt die Checkbox als natives Feld in ihr Label', () => {
    const markup = renderToStaticMarkup(
      <Checkbox checked={false} onChange={() => undefined}>
        Zählt wie eine Klausur
      </Checkbox>,
    );

    expect(markup).toStartWith('<label');
    expect(markup).toInclude('type="checkbox"');
    expect(markup).toInclude('Zählt wie eine Klausur');
  });

  it('legt das Radiofeld mit seinem Gruppennamen in sein Label', () => {
    const markup = renderToStaticMarkup(
      <Radio checked={true} name="sammlung-test" onSelect={() => undefined}>
        Jeder Test zählt einzeln
      </Radio>,
    );

    expect(markup).toStartWith('<label');
    expect(markup).toInclude('type="radio"');
    expect(markup).toInclude('name="sammlung-test"');
    expect(markup).toInclude('Jeder Test zählt einzeln');
  });

  it('zeichnet Radios eckig und im Kontrastmodus nativ', () => {
    const markup = renderToStaticMarkup(
      <Radio checked={true} name="aufteilung" onSelect={() => undefined}>
        Schriftlich : mündlich
      </Radio>,
    );

    expect(markup).toInclude('appearance-none');
    expect(markup).toInclude('border-border-strong');
    expect(markup).toInclude('checked:bg-primary');
    expect(markup).toInclude('bg-clip-content p-1');
    expect(markup).toInclude('forced-colors:appearance-auto');
    expect(markup).not.toInclude('rounded-');
    expect(markup).not.toInclude('<svg');
  });

  it('ordnet die Beschreibung dem Radiofeld zu', () => {
    const markup = renderToStaticMarkup(
      <Radio
        checked={false}
        description="Gilt unabhängig von der Zahl der Noten."
        name="aufteilung"
        onSelect={() => undefined}
      >
        Festes Verhältnis
      </Radio>,
    );
    const descriptionId = describedByPattern.exec(markup)?.groups?.id;

    expect(descriptionId).toBeDefined();
    expect(markup).toInclude(
      `id="${descriptionId}">Gilt unabhängig von der Zahl der Noten.</span>`,
    );
  });

  it('lässt ein Radiofeld ohne Beschreibung unbeschrieben', () => {
    const markup = renderToStaticMarkup(
      <Radio checked={false} name="aufteilung" onSelect={() => undefined}>
        Kurz
      </Radio>,
    );

    expect(markup).not.toInclude('aria-describedby');
  });

  it('gibt den Auswahlzustand an das native Feld weiter', () => {
    const abgewaehlt = renderToStaticMarkup(
      <Checkbox checked={false} onChange={() => undefined}>
        Aus
      </Checkbox>,
    );
    const ausgewaehlt = renderToStaticMarkup(
      <Checkbox checked={true} onChange={() => undefined}>
        An
      </Checkbox>,
    );

    expect(abgewaehlt).not.toInclude('checked=""');
    expect(ausgewaehlt).toInclude('checked=""');
  });
});
