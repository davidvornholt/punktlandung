/**
 * The project's single easing curve. Must stay in sync with
 * `--ease-standard` in theme.css — motion.test.ts pins the pairing.
 */
// biome-ignore lint/style/noMagicNumbers: The tuple itself is the named easing constant; splitting its four control points into further constants adds no meaning.
export const easeStandard = [0.2, 0, 0, 1] as const;

export const easeStandardCss = `cubic-bezier(${easeStandard.join(', ')})`;
