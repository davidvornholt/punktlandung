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

Geprüfte Screenshots mit Demodaten werden von der Repo-Wurzel aus veröffentlicht:

```sh
bun standards screenshots publish /pfad/zu/vorher.png /pfad/zu/nachher.png
```

Der Befehl liest `config/screenshots.yaml` und das Zugangspaar in `secrets/assets.yaml` und gibt Markdown für den Pull Request aus. Bucket und öffentliche Domain verwaltet [personal-infra](https://github.com/davidvornholt/personal-infra/tree/main/infra/opentofu/cloudflare-dns); jedes Repository hat ein eigenes Zugangspaar, das in SOPS bleibt.

Vorher und Nachher mit derselben Route, denselben Demodaten, demselben UI-Zustand und derselben Fenstergröße aufnehmen; bei responsivem Verhalten zusätzlich eine Handy-Ansicht. Jedes Bild vor dem Veröffentlichen prüfen: Die URLs sind öffentlich und dauerhaft. Die zurückgegebenen Links kommen als Vorher/Nachher-Tabelle in den Abschnitt „Screenshots“ des Pull Requests.

Das Zugangspaar wird über den Broker angelegt oder ersetzt:

```sh
bun standards creds add cloudflare --account 831f91724ea62b0cb0215829eb001f66 --dest assets:assets.screenshots_rw --bucket personal-pr-screenshots --jurisdiction eu --s3 --permissions "Workers R2 Storage Bucket Item Write"
```

`bun standards creds plan` und `bun standards creds apply` zeigen und gleichen die vom Broker verwalteten Zugangsdaten ab.

## Deployment

[personal-infra](https://github.com/davidvornholt/personal-infra) betreibt `https://punktlandung.vornholt.online` und verwaltet Produktionskonfiguration und Secrets.
