export const lehneAuthFehlerAb = <T extends { readonly error: unknown }>(
  antwort: T,
): T | Promise<never> =>
  antwort.error === null ? antwort : Promise.reject(antwort.error);
