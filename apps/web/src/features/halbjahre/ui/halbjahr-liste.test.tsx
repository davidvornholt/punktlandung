import { describe, expect, it, mock } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';

import { HalbjahrDeletionBlockedByNoten } from '../errors/halbjahr-errors.ts';
import type { HalbjahrWithNotenCount } from '../services/halbjahr-service.ts';
import type { HalbjahrDeletionDecision } from './halbjahr-deletion-model.ts';
import {
  advanceHalbjahrDeletion,
  initialHalbjahrDeletionDecision,
} from './halbjahr-deletion-model.ts';
import { HalbjahrListe, HalbjahrRow } from './halbjahr-liste.tsx';
import {
  collectElements,
  createHalbjahr,
  textOf,
} from './halbjahr-ui-test-helpers.ts';

const rowProps = (
  halbjahr: HalbjahrWithNotenCount,
  decision: HalbjahrDeletionDecision,
  onDelete: Parameters<typeof HalbjahrRow>[0]['onDelete'] = mock(
    () => undefined,
  ),
  onDecisionChange: Parameters<
    typeof HalbjahrRow
  >[0]['onDecisionChange'] = mock(() => undefined),
): Parameters<typeof HalbjahrRow>[0] => ({
  decision,
  halbjahr,
  isFinalInSchoolYear: true,
  deletionError: null,
  isDeleting: false,
  isDeletionInProgress: false,
  onBearbeiten: () => undefined,
  onDecisionChange,
  onDelete,
});

const renderRow = (
  halbjahr: HalbjahrWithNotenCount,
  decision: HalbjahrDeletionDecision,
  onDelete: Parameters<typeof HalbjahrRow>[0]['onDelete'] = mock(
    () => undefined,
  ),
  onDecisionChange: Parameters<
    typeof HalbjahrRow
  >[0]['onDecisionChange'] = mock(() => undefined),
) => HalbjahrRow(rowProps(halbjahr, decision, onDelete, onDecisionChange));

describe('HalbjahrListe deletion interaction', () => {
  it('requires confirmation, supports cancel, and dispatches the second click', () => {
    const target = createHalbjahr('target', 1);
    let decision = initialHalbjahrDeletionDecision;
    const initialDecisionChange = mock(
      (nextDecision: HalbjahrDeletionDecision) => {
        decision = nextDecision;
      },
    );
    const initialRow = renderRow(
      target,
      decision,
      mock(() => undefined),
      initialDecisionChange,
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
    expect(decision).toEqual({
      _tag: 'confirmation',
      expectedFinalInSchoolYear: true,
    });

    const confirmedDecision = decision;
    const decisionChange = mock(() => undefined);
    const onDelete = mock(() => undefined);
    const confirmedRow = renderRow(
      target,
      confirmedDecision,
      onDelete,
      decisionChange,
    );
    const buttons = collectElements(confirmedRow, 'button');
    const cancel = buttons.find((button) => textOf(button) === 'Abbrechen');
    (
      cancel?.props as {
        readonly onClick: () => void;
      }
    ).onClick();
    expect(decisionChange).toHaveBeenCalledWith(
      initialHalbjahrDeletionDecision,
    );

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
    expect(onDelete).toHaveBeenCalledWith({
      adjacentFocusTarget: adjacentTrigger,
      deletionTrigger,
      expectedFinalInSchoolYear: true,
    });
  });

  it('renders the Fach reset warning only for the final Halbjahr', () => {
    const target = createHalbjahr('target', 1);
    const finalDecision = advanceHalbjahrDeletion(
      initialHalbjahrDeletionDecision,
      true,
    ).decision;
    const nonFinalDecision = advanceHalbjahrDeletion(
      initialHalbjahrDeletionDecision,
      false,
    ).decision;
    const finalRow = renderRow(target, finalDecision);
    const otherHalfRow = HalbjahrRow({
      ...rowProps(target, nonFinalDecision),
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
