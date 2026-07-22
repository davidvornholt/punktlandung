# Repository secrets

Secret values live only in the SOPS-encrypted `dev.yaml` and `ci.yaml` targets. Their plaintext shapes are documented in the matching `*.example.yaml` files. Never paste a secret into a command argument, commit, issue, pull request, or log.

## Development target

`dev.yaml` contains workspace-scoped development credentials. `just dev-env-generate` decrypts it into ignored owner-only `.env.local` files. Public web configuration is versioned separately in `apps/web/.env`.

## CI target

`ci.yaml` is bootstrapped by the native `SOPS_AGE_KEY` Actions secret and must contain these keys below `ci`:

- `github_settings_read_token`: repository-scoped fine-grained PAT with Administration read and Issues read.
- `ntfy_topic_url`: full `https://ntfy.sh/<topic>` URL with a high-entropy, unguessable topic; the topic itself is the credential.
- `standards_sync_token`: repository-scoped fine-grained PAT with Contents read and Pull requests write.

Generate an ntfy topic locally with `openssl rand -hex 32` and prefix it with `https://ntfy.sh/`. Create the standards-sync PAT for only this repository with the permissions above, preserve the existing settings-read PAT, then run `just secrets edit ci` and add the missing values under `ci`. SOPS opens a temporary plaintext editor buffer and writes only encrypted ciphertext back to `ci.yaml`.

Verify the shape without printing values by extracting each key into a shell variable and testing that it is non-empty and single-line. Verify the consumers by temporarily applying the `needs-clarification` label to a test issue and checking the `Notify pause` run plus the ntfy subscriber, and by observing the next scheduled `Standards sync` run open its PR without the token-fallback warning. Remove the test label and issue afterward. The current encrypted target still lacks the ntfy and standards-sync values; setup is incomplete until both checks succeed.
