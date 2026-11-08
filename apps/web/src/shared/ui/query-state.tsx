import { secondaryButtonClass } from './form-classes.ts';
import type { QueryState } from './query-state-model.ts';

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

/**
 * Lade- und Fehlerhinweise einer Liste. Scheitert erst das Neuladen, bleibt
 * die Liste stehen und der Fehler erscheint als Hinweis darüber.
 */
export const ListQueryHints = ({
  errorText,
  isError,
  onRetry,
  pendingText,
  refreshErrorText,
  state,
}: {
  readonly errorText: string;
  readonly isError: boolean;
  readonly onRetry: () => unknown;
  readonly pendingText: string;
  readonly refreshErrorText: string;
  readonly state: QueryState;
}) => {
  if (state === 'pending') {
    return (
      <div className="mt-4">
        <LoadingHint text={pendingText} />
      </div>
    );
  }
  if (state === 'error' || isError) {
    return (
      <div className="mt-4">
        <QueryError
          onRetry={onRetry}
          text={state === 'error' ? errorText : refreshErrorText}
        />
      </div>
    );
  }
  return null;
};
