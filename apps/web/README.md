# @punktlandung/web

Die Punktlandung-Web-App: TanStack Start (React) auf Bun, Tailwind v4 mit den Refined-Heritage-Tokens aus `@punktlandung/ui`, Drizzle auf PostgreSQL, Effect für die Anwendungslogik und Better Auth (nur GitHub) für den privaten Zugang.

## Konfiguration und Secrets

Alle Werte werden an ihrer serverseitigen Konfigurationsgrenze validiert; der Prozess startet nicht mit unvollständiger oder ungültiger Konfiguration. Öffentliche Entwicklungswerte liegen in der versionierten `.env`. `just dev-env-generate` erzeugt ausschließlich die geheime `.env.local` aus der SOPS-verschlüsselten `secrets/dev.yaml` (Form: `secrets/dev.example.yaml`); beide Dateien werden von Bun/Vite gemeinsam geladen.

| Variable | Pflicht | Secret | Verhalten |
| --- | --- | --- | --- |
| `DATABASE_URL` | ja | ja | PostgreSQL-Verbindungs-URL. Ein Pool pro Prozess (`src/shared/db/pool.ts`); Better Auth und die Effect-Schicht teilen ihn. |
| `BETTER_AUTH_SECRET` | ja | ja | Signiergeheimnis für Better-Auth-Sitzungen, mindestens 32 Zeichen. |
| `BETTER_AUTH_URL` | nein | nein | Öffentliche Basis-URL der App (z. B. `https://punktlandung.vornholt.online`). Ohne Wert leitet Better Auth die URL aus dem Request ab; hinter einem Proxy sollte sie gesetzt sein. |
| `GITHUB_CLIENT_ID` | ja | nein | Öffentliche Client-ID der GitHub-OAuth-App (Callback: `<Basis-URL>/api/auth/callback/github`). |
| `GITHUB_CLIENT_SECRET` | ja | ja | Client-Secret der GitHub-OAuth-App. |
| `GITHUB_ALLOWED_ACCOUNT_ID` | ja | nein | Unveränderliche positive numerische GitHub-Account-ID des einzigen zugelassenen Kontos. Sie wird bei jeder GitHub-Anmeldung und vor jeder akzeptierten Sitzung geprüft. |
| `PORT` | nein (Default `3000`) | nein | Nur Produktionsserver (`scripts/serve.ts`): ganzzahliger Port von 1 bis 65535, auf dem Bun lauscht. |

## Entwicklung

```sh
# 1. Datenbank starten (Repo-Wurzel)
bun run --filter @punktlandung/web db:up

# 2. geheime .env.local aus secrets/dev.yaml erzeugen
just dev-env-generate

# 3. Schema in die Dev-Datenbank drücken
bun run --filter @punktlandung/web db:push

# 4. Dev-Server auf http://localhost:3000
bun run dev
```

Die `db:*`-Skripte laden `.env.local` selbst (`bun --env-file`); Drizzle Kit liest `DATABASE_URL` absichtlich direkt aus `process.env`, weil seine Konfiguration außerhalb der App-Laufzeit ausgewertet wird. Generierte `.env.local`-Dateien werden nie von Hand gepflegt.

## Fach- und Zeugnislogik

Fachname, Kürzel, Archivstatus und alle Gewichtungen werden je Schuljahr historisiert und von dessen beiden Halbjahre gemeinsam verwendet. Noten müssen innerhalb des inklusiven Halbjahr-Zeitraums liegen; ein belegtes Halbjahr darf weder das Notensystem noch das Schuljahr wechseln und darf vorhandene Noten nicht durch eine Zeitraumänderung ausschließen.

Die Jahresvorschau für ein vollständiges Sechser-Schuljahr wertet alle erfassten Leistungen beider Halbjahre unter den für das Schuljahr verkündeten Gewichtungen aus. Sie ist eine nicht bindende Orientierung: Die offizielle Zeugnisnote in Baden-Württemberg ist eine pädagogisch-fachliche Gesamtwertung und keine rein mathematische Note.

## Produktion

`bun run build` erzeugt `dist/client` (statische Assets) und `dist/server/server.js` (SSR-Fetch-Handler). `bun run start` startet `scripts/serve.ts`: Bun.serve bedient die statischen Assets und reicht alles andere an den SSR-Handler weiter. `/api/healthz` antwortet ohne Datenbankzugriff und dient als Container-Healthcheck.

Die Umstellung von `GITHUB_ALLOWED_LOGIN` auf `GITHUB_ALLOWED_ACCOUNT_ID` ist absichtlich nicht abwärtskompatibel. Vor dem Deployment muss `personal-infra` die neue öffentliche Account-ID setzen und den alten Login-Wert entfernen. Bereits bestehende Sitzungen eines anders verknüpften Accounts werden bei der nächsten Prüfung abgelehnt und widerrufen.

GitHub-Zugriffs- und Refresh-Tokens werden von Better Auth vor dem Speichern verschlüsselt. Bestehende Klartextzeilen bleiben durch Better Auth lesbar und werden bei der nächsten erfolgreichen GitHub-Anmeldung durch verschlüsselte Token ersetzt; dafür ist keine Schema-Migration nötig.

## Tests

- `bun run test` — Bun-Unit-Tests sowie PostgreSQL-Integrationstests für Kalenderdaten und Bestandsmigrationen. `DATABASE_URL` (oder die lokale Standardverbindung auf Port 15432) muss auf einen erreichbaren PostgreSQL-Server zeigen; der verbundene Benutzer benötigt `CREATE DATABASE`. Die Integrationssuiten erstellen je Test temporäre Datenbanken und löschen sie anschließend wieder.
- `bun run test:a11y` — Playwright + Axe gegen den Produktions-Build (WCAG 2.2 AA, null Verstöße). Gescannt wird die unauthentifizierte Oberfläche; die angemeldeten Seiten sind mangels testbarem OAuth-Login noch nicht abgedeckt.
