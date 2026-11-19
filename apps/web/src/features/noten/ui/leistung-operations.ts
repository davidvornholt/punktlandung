import { leistungFn } from '../server/noten-fns.ts';
import type { LeistungDetail } from '../services/noten-service.ts';

/**
 * Der Serveraufruf der Detailseite hinter einer Naht, wie `NotenOperations`:
 * so lässt sich die Seite ohne die Laufzeit der Serverfunktionen rendern und
 * prüfen.
 */
export type LeistungOperations = {
  readonly load: (id: string) => Promise<LeistungDetail>;
};

export const liveLeistungOperations: LeistungOperations = {
  load: (id) => leistungFn({ data: { id } }),
};
