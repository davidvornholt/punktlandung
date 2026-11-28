import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useId } from 'react';

import { buttonClass, hintClass } from '#/shared/ui/form-classes.ts';
import { buttonIconSize, iconSize, iconStroke } from '#/shared/ui/icon.ts';
import type { ValueWords } from './note-entry-model.ts';

const stepClass =
  'grid size-11 place-items-center transition-colors duration-100 ease-standard hover:bg-sheet';

/**
 * What the bar reads while a Note is entered, like the display of a measuring
 * instrument: the figure, what it would count, and where it leaves the Fach.
 */
export const NoteEntryReadout = ({
  formId,
  hint,
  onClear,
  onStep,
  valueText,
  words,
}: {
  /** The form the figure belongs to; it is drawn outside of it. */
  readonly formId: string;
  readonly hint: string;
  /** Takes the disc off the bar again; `null` where the Leistung cannot stay without a Note. */
  readonly onClear: (() => void) | null;
  readonly onStep: (direction: -1 | 1) => void;
  /** "10 P.", or `null` while the disc is not on the bar. */
  readonly valueText: string | null;
  readonly words: ValueWords;
}) => {
  const labelId = useId();
  return (
    <div
      className="@container mt-1 max-w-[35.5rem] animate-eases-in border-line border-t pt-2.5"
      data-note-entry=""
    >
      {/* Two columns need 17.5rem: the figure's, the gap, and 9rem for "11,25 Notenpunkten.", which does not break. With less, as at a large text size, everything stacks. */}
      <div className="grid @min-[17.5rem]:desk:grid-cols-[9.375rem_minmax(0,1fr)] @min-[17.5rem]:grid-cols-[7.75rem_minmax(0,1fr)] grid-cols-[minmax(0,1fr)] items-center desk:gap-x-5 gap-x-3">
        <span
          className="col-span-full mb-0.5 text-ink-soft text-sm"
          id={labelId}
        >
          {words.label}
        </span>
        <output
          aria-labelledby={labelId}
          className="whitespace-nowrap font-bold desk:text-4xl text-[2.5rem] leading-[1.1] tracking-[-0.02em]"
          form={formId}
        >
          {valueText ?? (
            <span className="font-normal text-2xl text-ink-soft tracking-normal">
              noch offen
            </span>
          )}
        </output>
        <p className={`${hintClass} wrap-break-word`}>{hint}</p>
        {/* On a phone one step of the bar is narrower than a finger, so the disc can also be moved step by step. */}
        <div className="mt-2 inline-flex desk:hidden justify-self-start border-[1.5px] border-ink bg-paper">
          <button
            aria-label={words.stepLeft}
            className={stepClass}
            onClick={() => onStep(-1)}
            type="button"
          >
            <ChevronLeft
              aria-hidden={true}
              size={iconSize}
              strokeWidth={iconStroke}
            />
          </button>
          <button
            aria-label={words.stepRight}
            className={`${stepClass} border-line border-l`}
            onClick={() => onStep(1)}
            type="button"
          >
            <ChevronRight
              aria-hidden={true}
              size={iconSize}
              strokeWidth={iconStroke}
            />
          </button>
        </div>
        {onClear === null ? null : (
          <button
            className={`${buttonClass('plain', 'compact')} @min-[17.5rem]:col-start-2 mt-1 -ml-2 justify-self-start`}
            onClick={onClear}
            type="button"
          >
            <X
              aria-hidden={true}
              size={buttonIconSize}
              strokeWidth={iconStroke}
            />
            Offen lassen
          </button>
        )}
      </div>
    </div>
  );
};
