import { ChevronRight, Minus, Plus } from 'lucide-react';
import { useId, useState } from 'react';
import {
  leistungsartLabel,
  leistungsartReihenfolge,
} from '#/shared/noten/leistungsart-text.ts';
import { DateField } from '#/shared/ui/date-field.tsx';
import {
  errorBoxClass,
  hintClass,
  inputClass,
  labelClass,
  linkClass,
  primaryButtonClass,
  secondaryButtonClass,
  sheetClass,
} from '#/shared/ui/form-classes.ts';
import { buttonIconSize, iconStroke } from '#/shared/ui/icon.ts';
import { Segmented } from '#/shared/ui/segmented.tsx';
import { notenLimits } from '../schemas/note-schema.ts';
import type { Leistung } from '../services/noten-service.ts';
import {
  canSubmit,
  type EntryDraft,
  type EntryFach,
  entryMode,
  entryTitle,
  gewichtText,
  kindHint,
  stepGewicht,
  submitLabel,
} from './note-entry-model.ts';

const stepClass =
  'grid desk:h-[2.4375rem] h-11 desk:w-[2.375rem] w-11 place-items-center transition-colors duration-100 ease-standard hover:bg-sheet disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-transparent';

/** How many times the Note counts. Rarely anything but once, so it steps instead of asking for a figure. */
const GewichtStepper = ({
  gewicht,
  onChange,
}: {
  readonly gewicht: number;
  readonly onChange: (gewicht: number) => void;
}) => (
  <fieldset className="min-w-0">
    <legend className="mb-1.5 text-ink-soft text-sm">Gewicht</legend>
    <div className="inline-flex items-stretch border-[1.5px] border-ink bg-paper">
      <button
        aria-label="Gewicht verringern"
        className={stepClass}
        disabled={gewicht <= notenLimits.gewichtungStep}
        onClick={() => onChange(stepGewicht(gewicht, -1))}
        type="button"
      >
        <Minus
          aria-hidden={true}
          size={buttonIconSize}
          strokeWidth={iconStroke}
        />
      </button>
      <output className="grid min-w-[4.75rem] place-items-center border-line border-x px-2 text-[0.90625rem]">
        {gewichtText(gewicht)}
      </output>
      <button
        aria-label="Gewicht erhöhen"
        className={stepClass}
        disabled={gewicht >= notenLimits.maxGewichtung}
        onClick={() => onChange(stepGewicht(gewicht, 1))}
        type="button"
      >
        <Plus
          aria-hidden={true}
          size={buttonIconSize}
          strokeWidth={iconStroke}
        />
      </button>
    </div>
  </fieldset>
);

/** On a phone the five Leistungsarten only fit side by side with less air around each. */
const kindOptions = leistungsartReihenfolge.map((kind) => ({
  value: kind,
  label: (
    <span className="-mx-2 desk:mx-0 desk:text-ui text-sm">
      {leistungsartLabel[kind]}
    </span>
  ),
}));

export type NoteEntryFormProps = {
  readonly draft: EntryDraft;
  /** Why the last attempt to save failed; `null` without a failure. */
  readonly error: string | null;
  readonly fach: EntryFach;
  readonly formId: string;
  /** The first and the last day a Leistung of this Halbjahr can have. */
  readonly halbjahr: { readonly startsOn: string; readonly endsOn: string };
  /** The Leistung whose Note is entered or changed; `null` for a new one. */
  readonly leistung: Leistung | null;
  readonly onCancel: () => void;
  readonly onChange: (draft: EntryDraft) => void;
  /** Offers to continue in another Fach. Left out where the Fach is fixed. */
  readonly onOtherFach?: () => void;
  readonly onSubmit: () => void;
  readonly pending: boolean;
  readonly today: string;
};

/**
 * The sheet beside the bar: everything about a Note except the Note itself,
 * which is chosen on the bar.
 */
export const NoteEntryForm = ({
  draft,
  error,
  fach,
  formId,
  halbjahr,
  leistung,
  onCancel,
  onChange,
  onOtherFach,
  onSubmit,
  pending,
  today,
}: NoteEntryFormProps) => {
  const titleId = useId();
  // Open from the start when there is something in it; afterwards the reader decides.
  const [extraOpen] = useState(draft.gewicht !== 1 || draft.notiz !== '');
  const hint = kindHint(draft.kind, fach.gewichtung);
  const blocked = pending || !canSubmit(draft);
  return (
    <form
      aria-labelledby={titleId}
      className={`${sheetClass} animate-eases-in desk:px-5 px-3.5 desk:pt-4 pt-3.5`}
      data-note-entry=""
      id={formId}
      noValidate={true}
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      {/*
       * The heading and the link share a row only from the width where both
       * fit; the width is in rem, so it follows the text size. Below it the
       * link takes its own line, and a word wider than the sheet breaks.
       */}
      <div className="@container">
        <div className="@min-[15.5rem]:flex items-baseline justify-between gap-3">
          <h3 className="wrap-break-word font-bold text-lg" id={titleId}>
            {entryTitle(leistung, fach.name)}
          </h3>
          {onOtherFach === undefined ? null : (
            <button
              // The words are small; what answers a finger reaches further than they do.
              className={`${linkClass} relative @min-[15.5rem]:mt-0 mt-1 min-h-7 whitespace-nowrap text-ink-soft text-sm after:absolute after:-inset-2 hover:text-ink disabled:cursor-not-allowed disabled:opacity-45`}
              disabled={pending}
              onClick={onOtherFach}
              type="button"
            >
              Anderes Fach
            </button>
          )}
        </div>
      </div>
      <Segmented
        className="mt-4"
        legend="Leistungsart"
        name="kind"
        onChange={(kind) => onChange({ ...draft, kind })}
        options={kindOptions}
        showLegend={true}
        value={draft.kind}
      />
      {hint === null ? null : <p className={`${hintClass} mt-1.5`}>{hint}</p>}
      <DateField
        className="mt-4"
        label="Datum"
        max={halbjahr.endsOn}
        min={halbjahr.startsOn}
        name="datum"
        onChange={(datum) => onChange({ ...draft, datum })}
        today={today}
        value={draft.datum}
      />
      <details className="group mt-3" open={extraOpen}>
        <summary className="inline-flex desk:min-h-9 min-h-11 cursor-pointer items-center gap-1.5 pr-1.5 text-[0.875rem] text-ink-soft hover:text-ink">
          <ChevronRight
            aria-hidden={true}
            className="transition-transform duration-150 ease-standard group-open:rotate-90"
            size={buttonIconSize}
            strokeWidth={iconStroke}
          />
          Gewicht und Notiz
        </summary>
        <div className="grid desk:grid-cols-[auto_minmax(0,1fr)] gap-x-3.5 gap-y-3 pt-1.5">
          <GewichtStepper
            gewicht={draft.gewicht}
            onChange={(gewicht) => onChange({ ...draft, gewicht })}
          />
          <label className={labelClass}>
            Notiz
            <input
              autoComplete="off"
              className={inputClass}
              name="notiz"
              onChange={(event) =>
                onChange({ ...draft, notiz: event.currentTarget.value })
              }
              placeholder="z. B. das Thema"
              value={draft.notiz}
            />
          </label>
        </div>
      </details>
      {/*
       * The sheet is often longer than the room left under the bar, on a phone
       * always, and most Noten need nothing below the Leistungsart. So its two
       * buttons stay in sight for as long as the sheet runs on underneath. On
       * a phone they stop above the tab bar, and the room below them is where
       * the page fades out into it.
       */}
      <div className="sticky bottom-[calc(4.75rem+env(safe-area-inset-bottom))] desk:bottom-0 z-10 -mx-3.5 desk:-mx-5 mt-4 flex flex-wrap gap-2 border-line-soft border-t bg-sheet desk:px-5 px-3.5 desk:pt-3.5 pt-3 desk:pb-4 pb-5">
        {/* Why a save failed is said where the button is that was pressed, so it is in sight wherever the sheet has been scrolled to. */}
        {error === null ? null : (
          <p className={`${errorBoxClass} mb-1 basis-full`} role="alert">
            {error}
          </p>
        )}
        <button
          aria-busy={pending}
          aria-disabled={blocked}
          // Fills the row on a phone, but not on a tablet held upright, where that would be most of the page.
          className={`${primaryButtonClass} max-w-96 desk:flex-none flex-1`}
          type="submit"
        >
          {submitLabel(entryMode(leistung), draft, pending)}
        </button>
        <button
          className={secondaryButtonClass}
          /*
           * Cancelling only closes the form; it would not stop a change that
           * is already on its way. If the button stayed usable, the change
           * would arrive after it had seemingly been cancelled.
           */
          disabled={pending}
          onClick={onCancel}
          type="button"
        >
          Abbrechen
        </button>
      </div>
    </form>
  );
};
