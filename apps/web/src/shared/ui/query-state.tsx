import { secondaryButtonClass } from './form-classes.ts';

export const LoadingHint = ({ text }: { readonly text: string }) => (
  <p aria-live="polite" className="text-ink-muted" role="status">
    {text}
  </p>
);

export const QueryError = ({
  text,
  onRetry,
}: {
  readonly text: string;
  readonly onRetry: () => unknown;
}) => (
  <div
    className="border border-critical bg-critical-subtle p-4 text-ink"
    role="alert"
  >
    <p>{text}</p>
    <button
      className={`${secondaryButtonClass} mt-3`}
      onClick={onRetry}
      type="button"
    >
      Erneut versuchen
    </button>
  </div>
);
