# Review decisions registry

Durable, already-litigated review decisions. How reviewers must treat entries and when orchestrators append them is defined in the `review` and `review-fix` skills.

Entry format: heading `### D-NNN (date, status) — title`, where status is `decided` or `open`, followed by the decision and its rationale in prose. Entries are never edited silently; superseding an entry means a new entry that references the old id.

## Entries

### D-001 (2026-07-22, decided) — Fach configuration belongs to the Schuljahr

Each Schuljahr owns a complete Fach snapshot shared by its two Halbjahre: display name and abbreviation, roster/archive state, order, Leistungsart weights, and written share. Existing installations keep their legacy rows as a read-only compatibility source until the first Fach mutation atomically materializes every existing school year; that mutation then changes only its explicitly selected year. A newly created school year deterministically copies the Fach snapshot of the most recently begun earlier school year. This preserves historical Notenlisten, Verlauf, and Zeugnis previews while letting the next school year change its roster or teacher-declared weights.

### D-002 (2026-07-22, decided) — Halbjahr and grade dates obey strict invariants

A Halbjahr's grading system and school year are immutable once it contains grades. Date edits are allowed only while every attached grade remains inside the new inclusive range, and grade creation or update accepts only dates inside its Halbjahr. Term edits and grade writes take mutually compatible database row locks inside transactions so concurrent requests cannot bypass these invariants.

### D-003 (2026-07-22, decided) — The annual result is a non-binding full-year preview

Baden-Württemberg does not prescribe an arithmetic combination of two Halbjahresnoten: § 7(2) NVO treats the official Zeugnisnote as a pedagogical-professional overall assessment rather than a purely mathematical result. Punktlandung therefore labels its annual result as a non-binding Jahresvorschau, calculates it transparently from all recorded assessments in both distinct Halbjahre under the Schuljahr's declared Fach weights and written/oral shares, and retains the Grenzfall signal as decision support rather than presenting the output as an official deterministic grade. Sources: [Regierungspräsidien Baden-Württemberg](https://rp.baden-wuerttemberg.de/themen/gesellschaft/schule-und-bildung/richtlinien/schulrecht/notengebung-und-versetzung/) and [Notenbildungsverordnung Baden-Württemberg](https://www.landesrecht-bw.de/perma?j=NotBildV_BW).
