import type { PointerEvent } from 'react';
import type { Geometry } from './geometry.ts';
import { nearestStep, type RulerScale, scaleUnits } from './scale.ts';
import { useScrubbing } from './scrubbing.ts';

/**
 * Choosing a Note on the bar itself. To the browser this is a group of radio
 * buttons, one per value, so arrow keys and screen readers work as they do
 * for any choice; to the eye it is the bar, and a pointer can drag along it.
 */
export type RulerPicker = {
  readonly legend: string;
  readonly name: string;
  readonly value: number | null;
  readonly onChange: (value: number) => void;
  /** Names a value for screen readers, such as "11 Notenpunkte". */
  readonly valueLabel: (value: number) => string;
  /** Id of the form the choice belongs to; the bar is drawn outside of it. */
  readonly form?: string;
};

export const PickerOverlay = ({
  geometry,
  picker,
  scale,
}: {
  readonly geometry: Geometry;
  readonly picker: RulerPicker;
  readonly scale: RulerScale;
}) => {
  const pick = (event: PointerEvent<HTMLFieldSetElement>): void => {
    const box = event.currentTarget.getBoundingClientRect();
    const value = nearestStep(
      scale,
      ((event.clientX - box.left) / box.width) * scaleUnits,
    );
    if (value !== picker.value) {
      picker.onChange(value);
    }
    // The pointer is captured, so the browser does not move focus itself; with it there, arrow keys go on from the value picked.
    event.currentTarget
      .querySelector<HTMLInputElement>(`input[value="${value}"]`)
      ?.focus({ preventScroll: true });
  };
  // A finger that scrolls the page past the bar picks nothing; a tap, a drag along the bar and a mouse do.
  const scrubbing = useScrubbing(pick);
  // Keyboard focus is shown on the bar itself, as a frame around the value's place. Ink, because the page's focus colour is too light on yellow in dark mode.
  const focusHeight = geometry.phone ? 'after:h-9' : 'after:h-10';
  return (
    <foreignObject
      height={geometry.beamY + geometry.beam}
      width={scaleUnits * geometry.pitch}
      x={geometry.x0}
      y={-geometry.beamY}
    >
      {/* biome-ignore lint/a11y/noNoninteractiveElementInteractions: The fieldset only keeps a press from taking focus off the radio button that press has just chosen. The radio buttons inside it are what the keyboard and screen readers use. */}
      <fieldset
        className="flex size-full cursor-pointer touch-pan-y select-none"
        onMouseDown={(event) => event.preventDefault()}
        {...scrubbing}
      >
        <legend className="sr-only">{picker.legend}</legend>
        {scale.steps.map((step) => (
          <label
            className={`relative min-w-0 flex-1 after:absolute after:inset-x-0 after:bottom-0 has-focus-visible:after:outline-[2.5px] has-focus-visible:after:outline-ruler-ink has-focus-visible:after:-outline-offset-3 ${focusHeight}`}
            key={step}
          >
            <input
              checked={picker.value === step}
              className="sr-only"
              form={picker.form}
              name={picker.name}
              onChange={() => picker.onChange(step)}
              type="radio"
              value={step}
            />
            <span className="sr-only">{picker.valueLabel(step)}</span>
          </label>
        ))}
      </fieldset>
    </foreignObject>
  );
};
