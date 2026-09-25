# Punktlandung

Persönlicher Notenüberblick für ein Gymnasium in Baden-Württemberg. Zugang erhält ein freigeschaltetes GitHub-Konto.

## Entwicklung

Die Bun-Version steht in `package.json`. Von der Repo-Wurzel aus:

```sh
bun install
bun run --filter @punktlandung/web db:up
just dev-env-generate
bun run --filter @punktlandung/web db:migrate
bun run dev
```

Öffentliche Entwicklungswerte stehen in `config/dev.yaml`, Secrets in `secrets/dev.yaml` mit Beispielen in `secrets/dev.example.yaml`. Maschinenlokale Überschreibungen gehören in `config/dev.local.yaml`; `just dev-env-generate` erzeugt daraus die `.env.local`-Dateien.

Die GitHub-OAuth-App benötigt den Callback `http://localhost:3000/api/auth/callback/github`. Der erlaubte Account wird über seine numerische ID konfiguriert.

`bun run check:fix` führt die Qualitätsprüfungen aus. Die Datenbanktests benötigen PostgreSQL und einen Benutzer mit `CREATE DATABASE`; sie erstellen und entfernen temporäre Datenbanken. Die Browserprüfungen decken derzeit die nicht angemeldete Oberfläche ab.

## Screenshots in Pull Requests

Aufnahme und Veröffentlichung folgen dem [Screenshot-Skill](.agents/skills/screenshots-in-prs/SKILL.md). Die Repository-Konfiguration steht in [config/screenshots.yaml](config/screenshots.yaml), die Zugangsdaten in `secrets/assets.yaml`. Das eigene Zugangspaar für den gemeinsamen Bucket wird so angelegt oder ersetzt:

```sh
bun standards creds add cloudflare --account 831f91724ea62b0cb0215829eb001f66 --dest assets:assets.screenshots_rw --bucket personal-pr-screenshots --jurisdiction eu --s3 --permissions "Workers R2 Storage Bucket Item Write"
```

## Deployment

[personal-infra](https://github.com/davidvornholt/personal-infra) betreibt `https://punktlandung.vornholt.online` und verwaltet Produktionskonfiguration und Secrets.

## Pull request previews

An open, non-draft pull request from this repository to `main` can request a preview with the `pr-preview` label. The exact head must pass the repository gate and container migration/health checks. A trusted workflow publishes its image and deploys it at `https://<number>.pr.punktlandung.vornholt.online`; the pull request comment records the current state. Workflow changes must merge before they can run in this preview lane.

The host permits one preview at a time. Each preview has an empty, isolated PostgreSQL database and an ephemeral session key; data is discarded on teardown. Updates replace the running image. Removing the label, converting to draft, retargeting away from `main`, closing the pull request, or a failed build/deployment removes the preview. Infrastructure and DNS are owned by `davidvornholt/personal-infra`.

GitHub sign-in is disabled in previews. The image check verifies that the provider redirect uses the preview's HTTPS callback URL, but the isolated runtime receives neither production OAuth credentials nor network egress. Enabling real preview sign-in requires a separately provisioned provider and egress policy. The `pr-preview` GitHub environment is restricted to `main` and holds only the age identity for the dedicated, forced-command preview SSH key in `secrets/pr-preview.yaml`.

<!-- Temporary preview lifecycle verification fixture. This PR is closed after verification. -->
