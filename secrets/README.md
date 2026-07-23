# Repository secrets

Secret values live only in the SOPS-encrypted `dev.yaml` and `ci.yaml` targets. Their plaintext shapes are documented in the matching `*.example.yaml` files. Never paste a secret into a command argument, commit, issue, pull request, or log.

## Development target

`dev.yaml` contains workspace-scoped development credentials. `just dev-env-generate` decrypts it into ignored owner-only `.env.local` files. Public web configuration is versioned separately in `apps/web/.env`.

## CI target

`ci.yaml` is bootstrapped by the native `SOPS_AGE_KEY` Actions secret and must contain these keys below `ci`:

- `github_settings_read_token`: repository-scoped fine-grained PAT with Administration read and Issues read.
- `ntfy_topic_url`: full `https://ntfy.sh/<topic>` URL with a high-entropy, unguessable topic; the topic itself is the credential.
- `broker_app.app_id` and `broker_app.private_key`: the broker GitHub App credentials used only to mint a short-lived, current-repository installation token with Contents read and Pull requests write.

Generate an ntfy topic locally with `openssl rand -hex 32` and prefix it with `https://ntfy.sh/`. Install the broker GitHub App only on this selected repository, then provision its nested encrypted shape with `bun standards creds add github --dest ci:ci.broker_app`. Preserve the existing settings-read PAT. The broker command writes directly through SOPS without printing the App credentials; `just secrets edit ci` remains the path for application-owned values.

Verify the shape without printing values by extracting each key into shell variables and testing that they are non-empty, that the ntfy URL is single-line and HTTPS, and that the private key has PEM shape. Verify the consumers by temporarily applying the `needs-clarification` label to a test issue and checking the `Notify pause` run plus the ntfy subscriber, and by observing a scheduled `Standards sync` run mint its scoped token and either open a PR or report a clean mirror. Remove the test label and issue afterward. Static provisioning is complete when all four encrypted values validate; runtime delivery remains unverified until those two workflows exercise the credentials.
