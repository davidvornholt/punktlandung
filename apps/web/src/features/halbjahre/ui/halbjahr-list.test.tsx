import { describe, expect, it, mock } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';

import { HalbjahrDeletionBlockedByNoten } from '../errors/halbjahr-errors.ts';
import type { HalbjahrWithNotenCount } from '../services/halbjahr-service.ts';
import type { HalbjahrDeletionDecision } from './halbjahr-deletion-model.ts';
import {
  advanceHalbjahrDeletion,
  initialHalbjahrDeletionDecision,
} from './halbjahr-deletion-model.ts';
import { HalbjahrList, HalbjahrRow } from './halbjahr-list.tsx';
import {
  collectElements,
  createHalbjahr,
  textOf,
} from './halbjahr-ui-test-helpers.ts';

const today = '2026-11-26';

/** What a list needs beside the Halbjahre and the deletion under test. */
const listProps = {
  highlightId: null,
  looks: new Map(),
  onDelete: () => undefined,
  onEdit: () => undefined,
  onHighlight: () => undefined,
  today,
} as const;

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
  keepsDeletePlace: true,
  deletionError: null,
  isDeleting: false,
  isDeletionInProgress: false,
  highlighted: false,
  look: 'current',
  today,
  onEdit: () => undefined,
  onDecisionChange,
  onDelete,
  onHighlight: () => undefined,
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

describe('HalbjahrList deletion interaction', () => {
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
    if (initialDelete === undefined) {
      throw new Error('Expected the initialDelete button');
    }
    const initialChange = (
      initialDelete.props as {
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
    const cancel = buttons.find((button) => textOf(button) === 'Behalten');
    if (cancel === undefined) {
      throw new Error('Expected the cancel button');
    }
    (
      cancel.props as {
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
    if (confirmedDelete === undefined) {
      throw new Error('Expected the confirmedDelete button');
    }
    (
      confirmedDelete.props as {
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

describe('HalbjahrList deletion rendering', () => {
  it('keeps global pending state while naming only the target', () => {
    const markup = renderToStaticMarkup(
      <HalbjahrList
        halbjahre={[createHalbjahr('first', 1), createHalbjahr('second', 2)]}
        deletion={{
          error: null,
          isError: false,
          isPending: true,
          variables: 'first',
        }}
        {...listProps}
      />,
    );

    expect(markup.match(/disabled=""/gu)).toHaveLength(2);
    expect(markup.match(/aria-busy="true"/gu)).toHaveLength(1);
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
        <HalbjahrList
          halbjahre={[createHalbjahr('target', 1, notenCount)]}
          deletion={mutation}
          {...listProps}
        />,
      );

    const reason = 'Löschen lässt sich nur ein leeres Halbjahr.';
    const empty = render(0);
    expect(empty).toContain('aria-label="Löschen"');
    expect(empty).not.toContain(reason);
    const refreshed = render(2);
    expect(refreshed).not.toContain('aria-label="Löschen"');
    expect(refreshed).toContain('2 Noten');
    expect(refreshed).toContain(reason);
    expect(refreshed).toContain('role="alert"');
  });
});
