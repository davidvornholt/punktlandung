import { type UseMutationOptions, useMutation } from '@tanstack/react-query';
import type { RefObject } from 'react';
import { useLayoutEffect, useRef } from 'react';

type Leaving = {
  readonly id: string;
  /** The Fächer that may take the keyboard over, the nearest first. */
  readonly heirs: ReadonlyArray<string>;
};

const row = (id: string): string => `[data-fach-row="${CSS.escape(id)}"]`;

/**
 * Archives a Fach and says where the keyboard goes then. The row takes the
 * button that archived it along, so the pencil of the next Fach takes over,
 * else that of the Fach before, else "Fach anlegen". While the Fach is on its
 * way its button is switched off and holds no focus either, so a Fach that
 * could not be archived gets the keyboard back on that button. Whoever has
 * moved on in the meantime keeps their place.
 */
export const useArchiving = ({
  faecher,
  fallbackRef,
  options,
  regionRef,
}: {
  readonly faecher: ReadonlyArray<{ readonly id: string }> | undefined;
  /** "Fach anlegen", for when no Fach is left. */
  readonly fallbackRef: RefObject<HTMLElement | null>;
  readonly options: UseMutationOptions<unknown, Error, string>;
  readonly regionRef: RefObject<HTMLElement | null>;
}) => {
  const mutation = useMutation(options);
  const failedId = mutation.isError ? mutation.variables : null;
  const leavingRef = useRef<Leaving | null>(null);
  useLayoutEffect(() => {
    const leaving = leavingRef.current;
    if (leaving === null) {
      return;
    }
    const ids = (faecher ?? []).map((fach) => fach.id);
    const gone = !ids.includes(leaving.id);
    if (!gone && failedId !== leaving.id) {
      return;
    }
    leavingRef.current = null;
    if (document.activeElement !== document.body) {
      return;
    }
    const region = regionRef.current;
    if (!gone) {
      region
        ?.querySelector<HTMLElement>(`${row(leaving.id)} [data-fach-archive]`)
        ?.focus();
      return;
    }
    const heir = leaving.heirs.find((id) => ids.includes(id));
    const pencil =
      heir === undefined
        ? null
        : region?.querySelector<HTMLElement>(`${row(heir)} [data-fach-edit]`);
    (pencil ?? fallbackRef.current ?? region)?.focus();
  }, [faecher, failedId, fallbackRef, regionRef]);

  return {
    mutation,
    archive: (id: string): void => {
      const ids = (faecher ?? []).map((fach) => fach.id);
      const index = ids.indexOf(id);
      leavingRef.current = {
        id,
        heirs: [...ids.slice(index + 1), ...ids.slice(0, index).reverse()],
      };
      mutation.reset();
      mutation.mutate(id);
    },
  };
};
