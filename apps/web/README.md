# @punktlandung/web

Die Punktlandung-Web-App: TanStack Start (React) auf Bun, Tailwind v4 mit den Refined-Heritage-Tokens aus `@punktlandung/ui`, Drizzle auf PostgreSQL, Effect für die Anwendungslogik und Better Auth (nur GitHub) für den privaten Zugang.

## Konfiguration und Secrets

Alle Werte werden serverseitig über `src/shared/env.ts` (t3-env) validiert; der Prozess startet nicht mit unvollständiger Konfiguration. In der Entwicklung erzeugt `just dev-env-generate` die Datei `.env.local` aus der SOPS-verschlüsselten `secrets/dev.yaml` (Form: `secrets/dev.example.yaml`).

| Variable | Pflicht | Secret | Verhalten |
| --- | --- | --- | --- |
| `DATABASE_URL` | ja | ja | PostgreSQL-Verbindungs-URL. Ein Pool pro Prozess (`src/shared/db/pool.ts`); Better Auth und die Effect-Schicht teilen ihn. |
| `BETTER_AUTH_SECRET` | ja | ja | Signiergeheimnis für Better-Auth-Sitzungen, mindestens 32 Zeichen. |
| `BETTER_AUTH_URL` | nein | nein | Öffentliche Basis-URL der App (z. B. `https://punktlandung.vornholt.online`). Ohne Wert leitet Better Auth die URL aus dem Request ab; hinter einem Proxy sollte sie gesetzt sein. |
| `GITHUB_CLIENT_ID` | ja | ja | Client-ID der GitHub-OAuth-App (Callback: `<Basis-URL>/api/auth/callback/github`). |
| `GITHUB_CLIENT_SECRET` | ja | ja | Client-Secret der GitHub-OAuth-App. |
| `GITHUB_ALLOWED_LOGIN` | nein (Default `davidvornholt`) | nein | Einziger GitHub-Login, der einen Benutzer anlegen darf — die App ist bewusst Single-User. |
| `PORT` | nein (Default `3000`) | nein | Nur Produktionsserver (`scripts/serve.ts`): Port, auf dem Bun lauscht. |

## Entwicklung

```sh
# 1. Datenbank starten (Repo-Wurzel)
bun run db:up

# 2. .env.local aus secrets/dev.yaml erzeugen (oder von Hand pflegen)
just dev-env-generate

# 3. Schema in die Dev-Datenbank drücken
bun run db:push

# 4. Dev-Server auf http://localhost:3000
bun run dev
```

Die `db:*`-Skripte laden `.env.local` selbst (`bun --env-file`); Drizzle Kit liest die Verbindung aus `src/shared/env.ts`.

## Produktion

`bun run build` erzeugt `dist/client` (statische Assets) und `dist/server/server.js` (SSR-Fetch-Handler). `bun run start` startet `scripts/serve.ts`: Bun.serve bedient die statischen Assets und reicht alles andere an den SSR-Handler weiter. `/api/healthz` antwortet ohne Datenbankzugriff und dient als Container-Healthcheck.

## Tests

- `bun run test` — Bun-Unit-Tests (Notenmathematik, Statistiken, Validierung).
- `bun run test:a11y` — Playwright + Axe gegen den Produktions-Build (WCAG 2.2 AA, null Verstöße). Gescannt wird die unauthentifizierte Oberfläche; die angemeldeten Seiten sind mangels testbarem OAuth-Login noch nicht abgedeckt.
