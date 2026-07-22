# Punktlandung

> Built on [davidvornholt/standards](https://github.com/davidvornholt/standards).

Persönlicher Notenüberblick für ein Gymnasium in Baden-Württemberg — ein Zeugnisheft, das erwachsen geworden ist. Noten je Halbjahr erfassen (Sechsersystem 1–6 oder Kursstufen-Notenpunkte 0–15), gewichtete Fachschnitte und die Verlaufslinie verfolgen, die Zeugnisvorschau samt Jahreszeugnis und Grenzfällen im Blick behalten, Lerntage zählen. Bewusst Single-User: Anmeldung nur über ein freigeschaltetes GitHub-Konto.

## Stack

- Bun + Turborepo-Monorepo, TypeScript strict, Biome maximal streng
- TanStack Start (React, dateibasierte Routen) mit TanStack Query
- Effect für Anwendungslogik und Validierung (effect/Schema), Drizzle auf PostgreSQL über `@effect/sql-drizzle`
- Better Auth (GitHub-only, Allowlist), Tailwind v4 mit semantischen Tokens aus `packages/ui` (Designsystem „Refined Heritage", siehe `DESIGN.md`)
- Playwright + Axe (WCAG 2.2 AA) über `@davidvornholt/a11y-testing`

## Monorepo-Layout

| Pfad | Inhalt |
| --- | --- |
| `apps/web` | Die App: Routen (Entrypoints), Features (`faecher`, `halbjahre`, `noten`, `zeugnis`, `lernen`), geteilte Infrastruktur unter `src/shared` |
| `packages/ui` | Theme-Tokens (`theme.css`) und Motion-Konstanten — einzige Quelle aller Designwerte |
| `packages/a11y-testing` | Kanonisches Axe/Playwright-Werkzeug (synced, nicht lokal ändern) |
| `packages/typescript-config` | Kanonische tsconfig-Basis (synced, nicht lokal ändern) |

## Qualitäts-Gates

```sh
bun run check       # standards check + turbo lint, check-types, test, build, test:a11y
bun run check:fix   # dito, mit Auto-Fixes
```

Details und Umgebungswerte: `apps/web/README.md`. Entwicklungs-Datenbank: `bun run db:up` in `apps/web`.

## Deployment

Das Root-`Dockerfile` baut ein Bun-Alpine-Image (Multi-Stage, Non-Root, Healthcheck gegen `/api/healthz`), das nur den Build-Output und Produktionsabhängigkeiten enthält. Das Image läuft auf `prod-1` hinter Caddy; öffentlicher Host ist `punktlandung.vornholt.online` (Caddy terminiert TLS und proxied auf Port 3000). Produktionskonfiguration kommt aus den Host-Secrets (`DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`).
