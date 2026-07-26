# Review decisions registry

Durable, already-litigated review decisions. How reviewers must treat entries and when orchestrators append them is defined in the `review` and `review-fix` skills.

Entry format: heading `### D-NNN (date, status) — title`, where status is `decided` or `open`, followed by the decision and its rationale in prose. Entries are never edited silently; superseding an entry means a new entry that references the old id.

## Entries

### D-001 (2026-07-22, decided) — Fach configuration belongs to the Schuljahr

Each Schuljahr owns a complete Fach snapshot shared by its two Halbjahre: display name and abbreviation, roster/archive state, order, Leistungsart weights, and written share. Existing installations keep their legacy rows as a read-only compatibility source until the first Fach mutation atomically materializes every existing school year; that mutation then changes only its explicitly selected year. A newly created school year deterministically copies the Fach snapshot of the most recently begun earlier school year. This preserves historical Notenlisten, Verlauf, and Zeugnis previews while letting the next school year change its roster or teacher-declared weights.

### D-002 (2026-07-22, decided) — Halbjahr and Note dates obey strict invariants

A Halbjahr's Notensystem and school year are immutable once it contains Noten. Date edits are allowed only while every attached Note remains inside the new inclusive range, and Note creation or update accepts only dates inside its Halbjahr. Halbjahr edits and Note writes take mutually compatible database row locks inside transactions so concurrent requests cannot bypass these invariants.

### D-003 (2026-07-22, decided) — The annual result is a non-binding full-year preview

Baden-Württemberg does not prescribe an arithmetic combination of two Halbjahresnoten: § 7(2) NVO treats the official Zeugnisnote as a pedagogical-professional overall assessment rather than a purely mathematical result. Punktlandung therefore labels its annual result as a non-binding Jahresvorschau, calculates it transparently from all recorded assessments in both distinct Halbjahre under the school year's declared Fachgewichtung and written/oral shares, and retains the Grenzfall signal as decision support rather than presenting the output as an official deterministic Note. Sources: [Regierungspräsidien Baden-Württemberg](https://rp.baden-wuerttemberg.de/themen/gesellschaft/schule-und-bildung/richtlinien/schulrecht/notengebung-und-versetzung/) and [Notenbildungsverordnung Baden-Württemberg](https://www.landesrecht-bw.de/perma?j=NotBildV_BW).

### D-004 (2026-07-25, decided) — The publish workflow waits for the standards gate instead of owning one

`Publish container` must stay on a bare `push` trigger: the image promotion proof in personal-infra binds this workflow by path and id and requires the publishing run to be a push-event run, so a `workflow_run` trigger is not available. A push to `main` carries no gate of its own — branch protection proves the required checks passed on a pull request head, not on the squash-merge commit that lands. The workflow therefore has a `gate` job that waits for the `Standards` push run at exactly `github.sha` and requires its `check` job to have concluded successfully, failing closed on a missing run, an unfinished run, any other conclusion, a missing job, or an expired deadline. Running `bun run check` inline instead was rejected: `Standards` is the canonical synced gate and already runs on push to `main`, so an inline copy would duplicate it and drift from it. Revisit only if the promotion proof stops requiring a push-event run.
