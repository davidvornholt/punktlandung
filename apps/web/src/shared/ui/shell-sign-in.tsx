import { BrandMark } from './brand-mark.tsx';
import { errorBoxClass, primaryButtonClass } from './form-classes.ts';
import { StandalonePage } from './shell-states.tsx';

/**
 * The page a visitor signs in on. It is the first thing anyone sees, so it
 * opens with the mark landing, and says in two sentences what the app does.
 */
export const SignInView = ({
  failed,
  onSignIn,
  pending,
}: {
  /** Starting the sign-in at GitHub did not work. */
  readonly failed: boolean;
  readonly onSignIn: () => void;
  readonly pending: boolean;
}) => (
  <StandalonePage>
    <BrandMark className="mb-3" height={130} motion="lands" />
    <h1 className="font-bold desk:text-4xl text-3xl tracking-[-0.02em]">
      Punktlandung
    </h1>
    <p className="mb-3 max-w-[38ch] text-ink-soft">
      Jede Note landet auf der Skala. Der Schnitt ist der Punkt, an dem sie im
      Gleichgewicht ist.
    </p>
    <button
      className={primaryButtonClass}
      disabled={pending}
      onClick={onSignIn}
      type="button"
    >
      {pending ? 'GitHub-Anmeldung wird geöffnet …' : 'Mit GitHub anmelden'}
    </button>
    {failed ? (
      <p className={`${errorBoxClass} max-w-[38ch] text-left`} role="alert">
        Die GitHub-Anmeldung konnte nicht gestartet werden. Prüfe die Verbindung
        und versuche es erneut.
      </p>
    ) : null}
    <p className="mt-1 text-ink-soft text-sm">
      Zugelassen ist ein einziges Konto.
    </p>
  </StandalonePage>
);
