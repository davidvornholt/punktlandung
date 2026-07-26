# Project-specific rules

Punktlandung is a single-user Noten tracker for a Baden-Württemberg Gymnasium (deployed as one container behind Caddy on prod-1, host `punktlandung.vornholt.online`; infrastructure lives in the personal-infra repository).

## Domain

- Two Notensysteme coexist: `sechser` (1–6, lower is better, Unter-/Mittelstufe) and `punkte` (Notenpunkte 0–15, higher is better, Kursstufe). A Halbjahr fixes its Notensystem; never mix Notensysteme inside a Halbjahr. The official conversion (Punkte = 17 − 3 × Note) lives in `src/shared/noten/` and is the only place allowed to encode it.
- Fachgewichtung is teacher-declared (per-Leistungsart Gewichtungen plus an optional schriftlich/mündlich share). Zeugnis previews round: Halbjahr to quarter steps (sechser) or whole Notenpunkte, Jahreszeugnis to whole Noten with an explicit Grenzfall flag. These rules are load-bearing product logic — change only with tests.
- UI language is German with sentence case; domain terms (Fach, Klausur, GFS, Halbjahr, Lerntage) are never translated.
- Code identifiers are German only where English has no faithful word. Domain vocabulary stays German — Fach, Note, Halbjahr, Klassenstufe, Leistungsart, Wertungsbereich, Gewichtung, Sammlung, Klausur, GFS, Notenpunkte, Zeugnis — because an English rendering would collapse a distinction the product turns on ("semester" is not a Halbjahr; "exam" erases Klausur vs. Test). Everything else is English: UI and React plumbing, dates, HTTP, persistence, generic helpers, local variables (`state`, `action`, `average`), and internal union values that never reach the screen. Mixed compounds are expected, not a smell: `createFach`, `faecherQueryOptions`, `halbjahrDateRange`. German UI copy is unaffected by this rule.

## Architecture decisions

- The database is intentionally app-private: schema, migrations, and config stay in `apps/web` (`src/shared/db`), not a `packages/db` package.
- Better Auth is the one non-Effect boundary: it owns `src/shared/auth` and shares the pg pool from `src/shared/db/pool.ts`. Everything else follows the Effect standards.
- Auth is GitHub-only with a single allowed immutable numeric account ID (`GITHUB_ALLOWED_ACCOUNT_ID`); there is no user management and none should be added.
- TanStack Start specifics: `src/routes` is the framework-required entrypoint location; `src/routeTree.gen.ts` is generated (regenerate via `bun run generate-routes`, excluded in `biome.jsonc`). Production serving goes through `apps/web/scripts/serve.ts` (Bun.serve wrapping the SSR handler from `dist/server/server.js`).

## Known gaps (do not silently "fix")

- Playwright a11y covers only the unauthenticated surface (`/anmelden`, redirect of `/`); authenticated pages need a test session strategy first — propose one before wiring it.
- `standards github` stays red until the GitHub repository exists and `bun standards github --apply` has run.
