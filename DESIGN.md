# DESIGN.md

Punktlandung instantiates the **Refined Heritage** archetype: warm, valuable, and enduring — a well-made heirloom for school grades. A noble serif meets disciplined, sharp-edged construction on warm cream ground; the app should feel like a trusted paper Zeugnisheft that grew up, not like a dashboard template. It is emphatically not minimalism: surfaces are warm rather than white, color is present rather than withheld, and screens are furnished, not emptied.

All design values live in `packages/ui/src/theme.css`. It is the single source of truth; no raw color, radius, shadow, or easing literals anywhere else.

## Deviations from the archetype

- UI language is German (sentence case per the writing standards); domain terms — Fach, Klausur, Halbjahr, Notenpunkte, GFS — are product vocabulary, never translated.
- Dark mode follows the system preference; there is no manual toggle in v1.
- Charts are first-class product surface, not illustration: they use the primary and accent tokens only, and judgement coloring (positive/critical) is reserved for grade deltas and warnings.

## Type

- Display type is the serif (`font-display`): page titles, section statements, card titles, and — always — grades themselves. A grade is the most valuable object in the product; set it in the serif, larger than its context, with tabular feel through consistent placement rather than monospace.
- Body and UI text is the grotesque (`font-sans`).
- Labels and metadata: grotesque, small, letterspaced, uppercase.
- Keep display tracking slightly tight.

## Surfaces and depth

- Page ground is `background`; content sits on `surface` cards with hairline `border` and the card shadow token. Sunken wells (`surface-sunken`) hold secondary or empty-state content.
- Corners are square everywhere. The radius scale deliberately does not exist; do not reintroduce it.
- Reserve the featured shadow for one featured element per screen at most (e.g. the Zeugnis summary).
- Depth in dark mode comes from surface lightness steps, not shadows or glow.

## Foreground rules

- On `background` and `surface`: text is `ink`, secondary text `ink-muted`, tertiary/metadata `ink-faint`.
- On `primary`: only `on-primary`.
- `accent` is for contrast moments — the current Halbjahr chip, a highlighted trend — never for large fills.
- Judgement colors: `positive` and `critical` communicate grade direction and Zeugnis warnings; never use them decoratively, and never communicate judgement by color alone (pair with text or symbol).

## Pattern vocabulary

- **Notenkarte** — a surface card holding one subject: serif subject name, uppercase metadata row, current average as a large serif figure.
- **Zeugnisblatt** — the featured report-card preview: a formal, table-like arrangement that visibly echoes a printed Zeugnis, one per Halbjahr.
- **Verlaufslinie** — the trend chart: primary line on quiet grid, accent for comparison series, no chart junk.
- **Eintragsleiste** — the quick-add grade form: one row, immediate, optimized for phone entry right after a Klausur is handed back.

## Layout rhythm

- Generous but purposeful spacing; roomy, never barren. Empty states are furnished with guidance in a sunken well, not blank space.
- Content column is centered and reading-width; charts and the Zeugnisblatt may span wide.

## Motion

- One easing curve for everything: the shared easing token (`ease-standard` utility; JS imports the constant from `@punktlandung/ui/motion`). Short, confident transitions; small lifts on hover; no bounce, no spectacle.
- Hover, focus, and press states are deliberate design moments: visible focus ring in `primary`, pressed states darken to `primary-strong`.

## Anti-patterns

- No rounded corners, ever.
- No pale minimalism, no gray-on-white austerity, no empty screens.
- No gradients as decoration, no glassmorphism, no neon.
- No default Tailwind palette classes; semantic token utilities only.
