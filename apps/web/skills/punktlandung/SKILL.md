---
name: punktlandung
description: Use when the user asks about their grades, averages or upcoming exams.
---

# Punktlandung

Punktlandung tracks the user's Noten at a Gymnasium in Baden-Württemberg. The `punktlandung` command only reads; Noten are entered and changed in the app. Run `punktlandung --help` for commands and options.

- Commands read the current Halbjahr, or else the last one begun, unless `--halbjahr` names another by label such as `10.2` or `J1.1`, or by the id from `punktlandung halbjahre list` when a repeated Klassenstufe makes a label ambiguous.
- A Halbjahr's `system` is `sechser` (1 to 6, lower is better) or `punkte` (Notenpunkte 0 to 15, higher is better, in J1 and J2). Never average or compare values across systems.
- A Leistung with `status` `planned` is an announced Klausur, Test or GFS without a Note yet and counts in no average.
- Quote averages from `punktlandung zeugnis` rather than computing them. A Fach's `schnitt` is its unrounded average and `halbjahresnote` the Note that average rounds to, which `anzeige` prints. `anzeige` uses quarter steps in `sechser`: `2-` is 2.25, `2-3` is 2.5 and `3+` is 2.75. `grenzfall` marks a Jahresnote the teacher may round either way.
- Use a Fach's `gewichtung` only for what the app doesn't show, such as which Note a coming Klausur would need. `klausur`, `test` and `gfs` count as schriftlich, `muendlich` and `sonstige` as mündlich. With `verhaeltnis` null, all Noten form one weighted list; otherwise each Wertungsbereich is averaged alone, a Bereich without Noten drops out, and the two combine in the given ratio. Under `arten.<kind>`, `einzeln` weights each Note by `gewicht` times its own `gewicht`, and `gesammelt` first averages the kind's Noten, weighted by their own `gewicht`, into one Note of weight `gewicht`.
