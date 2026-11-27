import { type ReactNode, useEffect, useId, useRef, useState } from 'react';

import { clampIsoDate } from '#/shared/date/date-range.ts';
import {
  type Fachgewichtung,
  isPlanbar,
  type Notensystem,
} from '#/shared/noten/notenwert.ts';
import { formatNote } from '#/shared/noten/zeugnisnote.ts';
import type { DiscWrap } from '#/shared/ui/ruler/disc.tsx';
import { flag } from '#/shared/ui/ruler/disc-look.ts';
import { Ruler, type RulerProps } from '#/shared/ui/ruler/ruler.tsx';
import type { RulerPicker } from '#/shared/ui/ruler/ruler-picker.tsx';
import { scaleFor } from '#/shared/ui/ruler/scale.ts';
import type { NotenFields } from '../schemas/note-schema.ts';
import type { Leistung } from '../services/noten-service.ts';
import { useEntryEscape } from './entry-escape.ts';
import { fachRuler } from './fach-ruler.ts';
import { NoteEntryForm } from './note-entry-form.tsx';
import {
  canSubmit,
  draftId,
  draftOf,
  type EntryDraft,
  type EntryPreview,
  fieldsOf,
  nudge,
  previewEntry,
  readoutHint,
  valueWords,
} from './note-entry-model.ts';
import { NoteEntryReadout } from './note-entry-readout.tsx';
import { tieUnits } from './noten-text.ts';

/** A Note is being entered or changed on the bench. */
export type NoteEntryState = {
  /** The Leistung whose Note is entered or changed; `null` for a new one. */
  readonly leistung: Leistung | null;
  /** What the form starts with instead of the Leistung's own values, such as what was typed before the Fach was changed. */
  readonly draft?: EntryDraft;
  readonly pending: boolean;
  /** Why the last attempt to save failed; `null` without a failure. */
  readonly error: string | null;
  /** The values to save, for the Fach of the bench. */
  readonly onSave: (values: NotenFields) => void;
  /** The entry is given up: "Abbrechen" or Escape. Not called while `pending`. */
  readonly onCancel: () => void;
  /** Offers "Anderes Fach" and hands over what was typed. Leave out where the Fach is fixed. */
  readonly onOtherFach?: (draft: EntryDraft) => void;
};

export type NotenBenchParts = {
  /** The bar with the discs. Keep it mounted in one place, so a saved Note can land on it. */
  readonly bench: ReactNode;
  /** The figure being entered and what it would do to the Fach; `null` without an entry. */
  readonly readout: ReactNode;
  /** The sheet with everything else about the Note; `null` without an entry. */
  readonly form: ReactNode;
};

export type NotenBenchProps = {
  readonly fach: {
    readonly id: string;
    readonly name: string;
    readonly gewichtung: Fachgewichtung;
  };
  readonly halbjahr: {
    readonly system: Notensystem;
    readonly startsOn: string;
    readonly endsOn: string;
  };
  /** The Leistungen of this Fach in this Halbjahr. */
  readonly leistungen: ReadonlyArray<Leistung>;
  /** ISO date. */
  readonly today: string;
  /** `null` shows the bench as it is. */
  readonly entry: NoteEntryState | null;
  /** The Leistung that was just saved; its disc drops from where it was held. */
  readonly landingId?: string | null;
  /** The Leistung a page is about; the other discs step back. */
  readonly focusId?: string;
  readonly dimension?: RulerProps['dimension'];
  readonly highlightId?: string | null;
  readonly onHighlight?: (id: string | null) => void;
  /** Wraps a disc, such as in a link to its Leistung. Not applied while a Note is entered. */
  readonly wrapDisc?: DiscWrap;
  /** Lays the three parts out; every page does that its own way. */
  readonly children: (parts: NotenBenchParts) => ReactNode;
};

const pickerName = 'wert';

/**
 * What is typed, kept for as long as the same entry is open. The bench stays
 * mounted between entries, so the draft is told apart by the Leistung it is for.
 */
const useDraft = (
  entry: NoteEntryState | null,
  defaultDate: string,
): readonly [EntryDraft | null, (draft: EntryDraft) => void] => {
  const key = entry === null ? null : draftId(entry.leistung);
  const [held, setHeld] = useState<{
    readonly key: string | null;
    readonly draft: EntryDraft | null;
  }>({ key: null, draft: null });
  const fresh =
    entry === null
      ? null
      : (entry.draft ?? draftOf(entry.leistung, defaultDate));
  if (held.key !== key) {
    setHeld({ key, draft: fresh });
  }
  return [
    held.key === key ? held.draft : fresh,
    (draft) => setHeld({ key, draft }),
  ];
};

/**
 * Puts the keyboard on the bar: on the Note that is chosen, or where a Note
 * of this Fach is most likely to go, so the arrow keys start from there.
 */
const focusBar = (host: HTMLElement | null, start: number | null): void => {
  const radio = (selector: string) =>
    host?.querySelector<HTMLInputElement>(
      `input[name="${pickerName}"]${selector}`,
    ) ?? null;
  (
    radio(':checked') ??
    radio(start === null ? '' : `[value="${start}"]`) ??
    radio('')
  )?.focus({ preventScroll: true });
};

/** Moves the keyboard to the bar when an entry opens, and on request afterwards. */
const useBarFocus = (key: string | null, start: number | null) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const startRef = useRef(start);
  useEffect(() => {
    startRef.current = start;
  });
  useEffect(() => {
    if (key === null) {
      return;
    }
    // The figure is drawn once its width is known, which is one frame after the bench appears.
    const frame = requestAnimationFrame(() =>
      focusBar(hostRef.current, startRef.current),
    );
    return () => cancelAnimationFrame(frame);
  }, [key]);
  return {
    hostRef,
    focus: (): void => focusBar(hostRef.current, startRef.current),
  };
};

type OpenEntry = {
  readonly draft: EntryDraft;
  readonly state: NoteEntryState;
  readonly preview: EntryPreview;
  readonly formId: string;
  readonly focusBar: () => void;
  readonly setDraft: (draft: EntryDraft) => void;
  /** Where the disc is set down by the step buttons when it is not on the bar yet. */
  readonly start: number | null;
};

type BenchContext = Pick<NotenBenchProps, 'fach' | 'halbjahr' | 'today'>;

const pickerOf = (
  { draft, formId, setDraft }: OpenEntry,
  system: Notensystem,
): RulerPicker => {
  const words = valueWords(system);
  return {
    form: formId,
    legend: words.legend,
    name: pickerName,
    onChange: (wert) => setDraft({ ...draft, wert }),
    value: draft.wert,
    valueLabel: words.valueLabel,
  };
};

const readoutOf = (
  { draft, focusBar: toBar, formId, preview, setDraft, start }: OpenEntry,
  { fach, halbjahr }: BenchContext,
): ReactNode => {
  const { system } = halbjahr;
  const setWert = (wert: number | null): void => setDraft({ ...draft, wert });
  return (
    <NoteEntryReadout
      formId={formId}
      hint={tieUnits(
        readoutHint({ draft, fachName: fach.name, preview, system }),
      )}
      onClear={
        draft.wert !== null && isPlanbar(draft.kind)
          ? () => {
              setWert(null);
              // The button goes away with the Note; the keyboard goes back to the bar.
              toBar();
            }
          : null
      }
      onStep={(direction) =>
        setWert(
          nudge({
            direction,
            start,
            steps: scaleFor(system).steps,
            value: draft.wert,
          }),
        )
      }
      valueText={draft.wert === null ? null : formatNote(draft.wert, system)}
      words={valueWords(system)}
    />
  );
};

const formOf = (
  { draft, focusBar: toBar, formId, setDraft, state }: OpenEntry,
  { fach, halbjahr, today }: BenchContext,
): ReactNode => {
  const { onOtherFach } = state;
  return (
    <NoteEntryForm
      draft={draft}
      error={state.error}
      fach={fach}
      formId={formId}
      halbjahr={halbjahr}
      key={draftId(state.leistung)}
      leistung={state.leistung}
      onCancel={state.onCancel}
      onChange={setDraft}
      onSubmit={() => {
        if (state.pending) {
          return;
        }
        if (canSubmit(draft)) {
          state.onSave(fieldsOf(draft, fach.id));
        } else {
          // Without a Note this Leistungsart cannot be saved; the readout says so, and the bar is where it is chosen.
          toBar();
        }
      }}
      pending={state.pending}
      today={today}
      {...(onOtherFach === undefined
        ? {}
        : { onOtherFach: () => onOtherFach(draft) })}
    />
  );
};

/**
 * The bench of a Fach: the bar its Noten lie on. A Note is entered and
 * changed here, on the bar itself, so what it would do to the Fachschnitt is
 * seen before it is saved.
 */
export const NotenBench = ({
  children,
  dimension = null,
  entry,
  fach,
  focusId,
  halbjahr,
  highlightId = null,
  landingId = null,
  leistungen,
  onHighlight,
  today,
  wrapDisc,
}: NotenBenchProps) => {
  const formId = useId();
  const { system } = halbjahr;
  const [draft, setDraft] = useDraft(
    entry,
    clampIsoDate(today, halbjahr.startsOn, halbjahr.endsOn),
  );
  const ruler = fachRuler({
    gewichtung: fach.gewichtung,
    leistungen,
    system,
    today,
    ...(focusId === undefined ? {} : { focusId }),
  });
  const start = nudge({
    direction: 1,
    start: ruler.evaluation.average,
    steps: scaleFor(system).steps,
    value: null,
  });
  const bar = useBarFocus(
    entry === null ? null : draftId(entry.leistung),
    start,
  );
  useEntryEscape(entry !== null && !entry.pending, () => entry?.onCancel());

  const open: OpenEntry | null =
    entry === null || draft === null
      ? null
      : {
          draft,
          state: entry,
          preview: previewEntry({
            draft,
            fach,
            leistung: entry.leistung,
            leistungen,
            system,
            today,
          }),
          formId,
          focusBar: bar.focus,
          setDraft,
          start,
        };
  const bench = (
    <div
      className="min-w-0"
      data-note-entry={flag(open !== null)}
      ref={bar.hostRef}
    >
      <Ruler
        candidate={open?.preview.candidate ?? null}
        dimension={open === null ? dimension : null}
        entering={open !== null}
        highlightId={highlightId}
        label={`${fach.name}: Noten auf der Skala`}
        landingId={landingId}
        model={ruler.model}
        picker={open === null ? null : pickerOf(open, system)}
        system={system}
        today={today}
        variant="bench"
        {...(onHighlight === undefined ? {} : { onHighlight })}
        {...(wrapDisc === undefined || open !== null ? {} : { wrapDisc })}
      />
    </div>
  );
  const context = { fach, halbjahr, today };
  return children({
    bench,
    readout: open === null ? null : readoutOf(open, context),
    form: open === null ? null : formOf(open, context),
  });
};
