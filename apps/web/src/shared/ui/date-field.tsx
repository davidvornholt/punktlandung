import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  type KeyboardEvent,
  type RefObject,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';

import {
  calendarKeyStep,
  calendarMonth,
  dayInMonth,
  monthOf,
  shiftMonth,
  weekdayHeads,
} from '../date/calendar-month.ts';
import { isIsoDateInRange } from '../date/date-range.ts';
import {
  addDays,
  formatLongDate,
  formatWeekdayFullDate,
  relativeDateText,
} from '../date/date-text.ts';
import { buttonClass } from './form-classes.ts';
import { iconSize, iconStroke } from './icon.ts';
import { IconButton } from './icon-button.tsx';
import { prefersReducedMotion } from './motion.ts';

const earliest = '0000-01-01';
const latest = '9999-12-31';

const dayClass =
  'relative grid h-9 place-items-center text-[0.90625rem] hover:bg-paper disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent aria-pressed:bg-ink aria-pressed:font-bold aria-pressed:text-paper';

/** Today carries the red dot a Note is drawn with. */
const todayClass =
  "font-bold after:absolute after:bottom-[3px] after:left-1/2 after:size-[5px] after:-translate-x-1/2 after:rounded-full after:bg-note after:content-['']";

type CalendarProps = {
  readonly max: string;
  readonly min: string;
  readonly onClose: () => void;
  readonly onPick: (isoDate: string) => void;
  readonly today: string;
  readonly value: string;
};

/** The day that takes part in the tab order, and whether the keyboard is moved onto it. */
type DayFocus = { readonly date: string; readonly taken: boolean };

/** Moves keyboard focus to a day once the month that holds it is drawn. */
const useDayFocus = (
  gridRef: RefObject<HTMLDivElement | null>,
  focus: DayFocus,
) => {
  useEffect(() => {
    if (focus.taken) {
      gridRef.current
        ?.querySelector<HTMLButtonElement>(`[data-date="${focus.date}"]`)
        ?.focus();
    }
  }, [gridRef, focus]);
};

/**
 * A field low on the page opens its calendar below the fold, or behind the
 * tab bar of a phone. So the page scrolls just far enough to show all of it,
 * and again when a month is turned to that needs one more row of weeks.
 */
const useKeptInView = (
  dialogRef: RefObject<HTMLDivElement | null>,
  month: string,
) => {
  // biome-ignore lint/correctness/useExhaustiveDependencies: `month` is not read here; it is what changes the calendar's height.
  useEffect(() => {
    dialogRef.current?.scrollIntoView({
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      block: 'nearest',
    });
  }, [dialogRef, month]);
};

const Calendar = ({
  max,
  min,
  onClose,
  onPick,
  today,
  value,
}: CalendarProps) => {
  const [focus, setFocus] = useState<DayFocus>({ date: value, taken: true });
  const [month, setMonth] = useState(monthOf(value));
  const gridRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  useDayFocus(gridRef, focus);
  useKeptInView(dialogRef, month);
  const shown = calendarMonth(month);
  const inRange = (isoDate: string): boolean =>
    isIsoDateInRange(isoDate, min, max);
  /** The day that takes the place of the one in the tab order `steps` months on; `null` where no day can be chosen. */
  const dayAfter = (from: string, steps: number): string | null =>
    dayInMonth(shiftMonth(from, steps), focus.date, { max, min });

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === 'Escape') {
      // The form around the field closes on Escape too; this press only closes the calendar.
      event.stopPropagation();
      onClose();
      return;
    }
    const step = calendarKeyStep(event.key);
    if (step === undefined) {
      return;
    }
    event.preventDefault();
    const target = addDays(focus.date, step);
    if (inRange(target)) {
      setMonth(monthOf(target));
      setFocus({ date: target, taken: true });
    }
  };
  const turn = (steps: number): void => {
    const target = dayAfter(month, steps);
    if (target !== null) {
      const turned = monthOf(target);
      setMonth(turned);
      // The tab order goes with the month. The keyboard stays on the button, unless this was its last turn: a disabled button cannot keep it.
      setFocus({ date: target, taken: dayAfter(turned, steps) === null });
    }
  };

  return (
    // biome-ignore lint/a11y/noNoninteractiveElementInteractions: The dialog listens for Escape and the arrow keys on behalf of the buttons inside it, which are what takes focus.
    <div
      aria-label="Datum wählen"
      className="absolute top-full left-0 z-20 mt-1.5 desk:w-[300px] w-full animate-eases-in border-[1.5px] border-ink bg-sheet px-2.5 pt-2 pb-2.5"
      onKeyDown={onKeyDown}
      ref={dialogRef}
      role="dialog"
    >
      <div className="mb-1 flex items-center justify-between">
        <IconButton
          disabled={dayAfter(month, -1) === null}
          icon={ChevronLeft}
          label="Vorheriger Monat"
          onClick={() => turn(-1)}
        />
        <strong aria-live="polite">{shown.title}</strong>
        <IconButton
          disabled={dayAfter(month, 1) === null}
          icon={ChevronRight}
          label="Nächster Monat"
          onClick={() => turn(1)}
        />
      </div>
      <div className="grid grid-cols-7 gap-0.5" ref={gridRef}>
        {weekdayHeads.map((weekday) => (
          <span
            aria-hidden="true"
            className="grid h-[26px] place-items-center text-ink-soft text-xs"
            key={weekday}
          >
            {weekday}
          </span>
        ))}
        {Array.from(
          { length: shown.leading },
          (_, index) => `gap-${index}`,
        ).map((gap) => (
          <span key={gap} />
        ))}
        {shown.days.map((isoDate, index) => (
          <button
            aria-label={formatLongDate(isoDate)}
            aria-pressed={isoDate === value}
            className={`${dayClass} ${isoDate === today ? todayClass : ''}`}
            data-date={isoDate}
            disabled={!inRange(isoDate)}
            key={isoDate}
            onClick={() => onPick(isoDate)}
            // One day takes part in the tab order; the arrow keys reach the others.
            tabIndex={isoDate === focus.date ? 0 : -1}
            type="button"
          >
            {index + 1}
          </button>
        ))}
      </div>
      {inRange(today) ? (
        <div className="mt-1 flex justify-end">
          <button
            className={buttonClass('quiet', 'compact')}
            onClick={() => onPick(today)}
            type="button"
          >
            Heute
          </button>
        </div>
      ) : null}
    </div>
  );
};

/** Closes the calendar when the pointer goes down anywhere outside the field. */
const useCloseOutside = (
  hostRef: RefObject<HTMLDivElement | null>,
  open: boolean,
  close: () => void,
) => {
  useEffect(() => {
    if (!open) {
      return;
    }
    const onPointerDown = (event: PointerEvent): void => {
      if (
        event.target instanceof Node &&
        hostRef.current?.contains(event.target) !== true
      ) {
        close();
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [hostRef, open, close]);
};

/**
 * A date, said the way it is spoken about: "Mo 16.11.2026 · in 2 Tagen". The
 * button opens a calendar whose weeks begin on Monday. With a `name` the ISO
 * date is part of the surrounding form.
 */
export const DateField = ({
  className,
  disabled = false,
  form,
  label,
  max = latest,
  min = earliest,
  name,
  onChange,
  today,
  value,
}: {
  readonly className?: string;
  readonly disabled?: boolean;
  /** Id of the form the date belongs to when the field is drawn outside of it. */
  readonly form?: string;
  readonly label: string;
  /** The last and the first ISO date that can be chosen. */
  readonly max?: string;
  readonly min?: string;
  readonly name?: string;
  readonly onChange: (isoDate: string) => void;
  /** ISO date; marked in the calendar and what "in 2 Tagen" counts from. */
  readonly today: string;
  readonly value: string;
}) => {
  const [open, setOpen] = useState(false);
  const hostRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const labelId = useId();
  const valueId = useId();
  useCloseOutside(hostRef, open, () => setOpen(false));
  const close = (): void => {
    setOpen(false);
    buttonRef.current?.focus();
  };
  return (
    <div className={`relative ${className ?? ''}`} ref={hostRef}>
      <span className="block text-ink-soft text-sm" id={labelId}>
        {label}
      </span>
      <button
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-labelledby={`${labelId} ${valueId}`}
        className="mt-1.5 flex min-h-[2.625rem] w-full items-center justify-between gap-2.5 border-[1.5px] border-ink bg-paper px-3 text-left disabled:cursor-not-allowed disabled:opacity-45"
        disabled={disabled}
        onClick={() => setOpen(!open)}
        ref={buttonRef}
        type="button"
      >
        <span id={valueId}>
          {formatWeekdayFullDate(value)} · {relativeDateText(today, value)}
        </span>
        <CalendarDays
          aria-hidden={true}
          className="shrink-0"
          size={iconSize}
          strokeWidth={iconStroke}
        />
      </button>
      {name === undefined ? null : (
        <input form={form} name={name} type="hidden" value={value} />
      )}
      {open ? (
        <Calendar
          max={max}
          min={min}
          onClose={close}
          onPick={(isoDate) => {
            onChange(isoDate);
            close();
          }}
          today={today}
          value={value}
        />
      ) : null}
    </div>
  );
};
