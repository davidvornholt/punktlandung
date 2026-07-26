import { describe, expect, it, mock } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';

import { HalbjahrDeletionBlockedByNoten } from '../errors/halbjahr-errors.ts';
import type { HalbjahrWithNotenCount } from '../services/halbjahr-service.ts';
import { HalbjahrListe, HalbjahrRow } from './halbjahr-liste.tsx';
import {
  collectElements,
  createHalbjahr,
  textOf,
} from './halbjahr-ui-test-helpers.ts';

const rowProps = (
  halbjahr: HalbjahrWithNotenCount,
  confirmed: boolean,
  onDelete = mock(() => undefined),
  onConfirmedChange = mock(() => undefined),
): Parameters<typeof HalbjahrRow>[0] => ({
  confirmed,
  halbjahr,
  isFinalInSchoolYear: true,
  deletionError: null,
  isDeleting: false,
  isDeletionInProgress: false,
  onBearbeiten: () => undefined,
  onConfirmedChange,
  onDelete,
});

const renderRow = (
  halbjahr: HalbjahrWithNotenCount,
  confirmed: boolean,
  onDelete = mock(() => undefined),
  onConfirmedChange = mock(() => undefined),
) => HalbjahrRow(rowProps(halbjahr, confirmed, onDelete, onConfirmedChange));

describe('HalbjahrListe deletion interaction', () => {
  it('requires confirmation, supports cancel, and dispatches the second click', () => {
    const target = createHalbjahr('target', 1);
    const initialConfirmedChange = mock(() => undefined);
    const initialRow = renderRow(
      target,
      false,
      mock(() => undefined),
      initialConfirmedChange,
    );
    const [, initialDelete] = collectElements(initialRow, 'button');
    const initialChange = (
      initialDelete?.props as {
        readonly onClick: (event: {
          readonly currentTarget: HTMLButtonElement;
        }) => void;
      }
    ).onClick;
    initialChange({ currentTarget: {} as HTMLButtonElement });
    expect(initialConfirmedChange).toHaveBeenCalledWith(true);

    const confirmedChange = mock(() => undefined);
    const onDelete = mock(() => undefined);
    const confirmedRow = renderRow(target, true, onDelete, confirmedChange);
    const buttons = collectElements(confirmedRow, 'button');
    const cancel = buttons.find((button) => textOf(button) === 'Abbrechen');
    (
      cancel?.props as {
        readonly onClick: () => void;
      }
    ).onClick();
    expect(confirmedChange).toHaveBeenCalledWith(false);

    const adjacentTrigger = {};
    const deletionTrigger = {
      closest: () => ({
        nextElementSibling: {
          querySelector: () => adjacentTrigger,
        },
        previousElementSibling: null,
      }),
    } as unknown as HTMLButtonElement;
    const confirmedDelete = buttons.find(
      (button) => textOf(button) === 'Wirklich löschen',
    );
    (
      confirmedDelete?.props as {
        readonly onClick: (event: {
          readonly currentTarget: HTMLButtonElement;
        }) => void;
      }
    ).onClick({ currentTarget: deletionTrigger });
    expect(onDelete).toHaveBeenCalledWith(adjacentTrigger);
  });

  it('renders the Fach reset warning only for the final Halbjahr', () => {
    const target = createHalbjahr('target', 1);
    const finalRow = renderRow(target, true);
    const otherHalfRow = HalbjahrRow({
      ...rowProps(target, true),
      isFinalInSchoolYear: false,
    });

    expect(textOf(finalRow)).toContain('konfigurierten Fächer');
    expect(textOf(otherHalfRow)).not.toContain('konfigurierten Fächer');
  });
});

describe('HalbjahrListe deletion rendering', () => {
  it('keeps global pending state while naming only the target', () => {
    const markup = renderToStaticMarkup(
      <HalbjahrListe
        halbjahre={[createHalbjahr('first', 1), createHalbjahr('second', 2)]}
        deletion={{
          error: null,
          isError: false,
          isPending: true,
          variables: 'first',
        }}
        onBearbeiten={() => undefined}
        onDelete={() => undefined}
      />,
    );

    expect(markup.match(/disabled=""/gu)).toHaveLength(2);
    expect(markup.match(/Wird gelöscht …/gu)).toHaveLength(1);
  });

  it('retains the row error after stale eligibility refreshes to occupied', () => {
    const error = new HalbjahrDeletionBlockedByNoten({
      halbjahrId: 'target',
      notenCount: 2,
    });
    const mutation = {
      error,
      isError: true,
      isPending: false,
      variables: 'target',
    };
    const render = (notenCount: number) =>
      renderToStaticMarkup(
        <HalbjahrListe
          halbjahre={[createHalbjahr('target', 1, notenCount)]}
          deletion={mutation}
          onBearbeiten={() => undefined}
          onDelete={() => undefined}
        />,
      );

    expect(render(0)).toContain('>Löschen</button>');
    const refreshed = render(2);
    expect(refreshed).not.toContain('>Löschen</button>');
    expect(refreshed).toContain('Enthält 2 Noten');
    expect(refreshed).toContain('role="alert"');
  });
});
