import { Check } from 'lucide-react';
import type { ComponentProps } from 'react';

/**
 * Ein Kästchen im Stil der App statt des Browserkästchens. Das echte
 * `<input>` bleibt für Tastatur und Vorlesen erhalten, ist aber unsichtbar
 * über das gezeichnete Kästchen gelegt; der Haken sitzt darunter und folgt
 * dem `:checked`-Zustand des Eingabefelds.
 */
export const Checkbox = ({
  className,
  ...rest
}: Omit<ComponentProps<'input'>, 'type'>) => (
  <span className={`relative inline-flex size-4 shrink-0 ${className ?? ''}`}>
    <input
      {...rest}
      className="peer absolute inset-0 m-0 size-full cursor-pointer appearance-none opacity-0 disabled:cursor-default"
      type="checkbox"
    />
    <span
      aria-hidden={true}
      className="pointer-events-none absolute inset-0 border border-border-strong bg-surface transition-colors duration-150 ease-standard peer-checked:border-primary peer-checked:bg-primary peer-hover:border-primary peer-focus-visible:outline-2 peer-focus-visible:outline-primary peer-focus-visible:outline-offset-2 peer-disabled:opacity-50"
    />
    <Check
      aria-hidden={true}
      className="pointer-events-none absolute inset-0 m-auto size-3 text-on-primary opacity-0 transition-opacity duration-150 ease-standard peer-checked:opacity-100"
      strokeWidth={3}
    />
  </span>
);
