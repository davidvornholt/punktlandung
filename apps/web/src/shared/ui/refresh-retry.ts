/**
 * Fokussiert das Ziel nur, wenn der Fokus noch auf dem Element liegt, das den
 * neuen Versuch gestartet hat, oder auf `<body>` gefallen ist. Wer den Fokus
 * währenddessen woanders hingelegt hat, etwa ins offene Formular, behält ihn.
 */
export const focusUnlessMoved = (
  origin: Element | null,
  target: HTMLElement | null,
) => {
  const active = document.activeElement;
  if (active === origin || active === document.body) {
    target?.focus();
  }
};

/**
 * Lädt erneut und fokussiert bei Erfolg das Ziel. Der Hinweis mit „Erneut
 * versuchen“ verschwindet nach einem erfolgreichen Neuladen samt Knopf; ohne
 * das fiele der Tastaturfokus an den Seitenanfang.
 */
export const retryWithFocus =
  (
    refetch: () => Promise<{ readonly isSuccess: boolean }>,
    target: { readonly current: HTMLElement | null },
  ) =>
  (): Promise<void> => {
    const origin = document.activeElement;
    return refetch().then((result) => {
      if (result.isSuccess) {
        focusUnlessMoved(origin, target.current);
      }
    });
  };
