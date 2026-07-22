import { sekundaerKnopfKlasse } from './form-klassen.ts';

export const Ladehinweis = ({ text }: { readonly text: string }) => (
  <p aria-live="polite" className="text-ink-muted" role="status">
    {text}
  </p>
);

export const AbfrageFehler = ({
  text,
  onWiederholen,
}: {
  readonly text: string;
  readonly onWiederholen: () => unknown;
}) => (
  <div
    className="border border-critical bg-critical-subtle p-4 text-ink"
    role="alert"
  >
    <p>{text}</p>
    <button
      className={`${sekundaerKnopfKlasse} mt-3`}
      onClick={onWiederholen}
      type="button"
    >
      Erneut versuchen
    </button>
  </div>
);
