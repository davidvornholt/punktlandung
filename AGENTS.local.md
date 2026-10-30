# Project-specific rules

Punktlandung is a single-user Noten tracker for a Baden-Württemberg Gymnasium. Its host and deployment wiring live in davidvornholt/personal-infra.

## Domain

- Two Notensysteme coexist: `sechser` (1–6, lower is better, Unter- and Mittelstufe) and `punkte` (Notenpunkte 0–15, higher is better, Kursstufe). A Halbjahr fixes its Notensystem and never mixes the two. Conversion between them follows the official Notentendenz anchors and lives only in `src/shared/noten/`.
- A Fach stores only the Gewichtung its teacher announced, in the scale it was announced in. Rules such as "eine GFS zählt wie eine Klausur" are derived from equal Gewichte, never stored.
- The Leistungsart fixes the Wertungsbereich, because teachers announce the ratio between the Wertungsbereiche, never which Leistungsart counts where. So there is no Wertungsbereich picker.
- Notensystem conversion, Gewichtung, and Zeugnis rounding are load-bearing product logic. Change them only with tests.
- UI copy is German in sentence case. Domain terms such as Fach, Klausur, GFS, Halbjahr, and Lerntage are never translated.
- Identifiers keep German domain vocabulary where English would collapse a distinction the product turns on: "semester" is not a Halbjahr, and "exam" erases Klausur versus Test. That vocabulary is Fach, Note, Halbjahr, Klassenstufe, Leistungsart, Wertungsbereich, Gewichtung, Sammlung, Klausur, GFS, Notenpunkte, and Zeugnis. Everything else is English, so mixed compounds such as `createFach` and `faecherQueryOptions` are expected.

## Architecture decisions

- The database is app-private. Its schema, migrations, and config stay in `apps/web/src/shared/db`, not in a `packages/db` package.
- Better Auth is the one non-Effect boundary, because it calls its glue itself and awaits plain promises. It owns `src/shared/auth` and uses the pg pool from `src/shared/db/pool.ts`, which the Effect layer doesn't share.
- Sign-in is GitHub-only and admits a single immutable numeric account ID (`GITHUB_ALLOWED_ACCOUNT_ID`). Don't add user management.

## Known gaps

- Playwright a11y covers only the unauthenticated surface. Authenticated pages need a test session strategy first, so propose one before wiring it.
