import { UsageError } from './errors/cli-errors.ts';

/*
 * Über SSH kommt die Befehlszeile als eine Zeile in `SSH_ORIGINAL_COMMAND`,
 * so gequotet, wie die Shell des Clients sie gequotet hätte. `splitShellWords`
 * zerlegt sie nach denselben Regeln: einfache und doppelte Anführungszeichen
 * und Backslashes. Eine Shell läuft dabei nie, und nichts davon wird einer
 * übergeben. Übernommen aus Postludes Befehl.
 */

/**
 * Ein Stück der Zeile, ab dem Ende des vorigen: Leerraum zwischen Wörtern, ein
 * Backslash vor einem Zeilenumbruch, der zwei Zeilen verbindet, oder ein Teil
 * eines Worts.
 */
const shellPiece = () =>
  /(?<blank>[ \t\n]+)|(?<continuation>\\\n)|'(?<single>[^']*)'|"(?<double>(?:[^"\\]|\\[\s\S])*)"|\\(?<escaped>[\s\S])|(?<plain>[^ \t\n'"\\]+)/uy;

/** In doppelten Anführungszeichen maskiert ein Backslash nur diese Zeichen; vor einem Zeilenumbruch entfallen beide. */
const doubleQuoteEscape = /\\(?<escaped>[\\"$`\n])/gu;

type ShellPiece = {
  readonly blank?: string;
  readonly continuation?: string;
  readonly single?: string;
  readonly double?: string;
  readonly escaped?: string;
  readonly plain?: string;
};

const wordPartOf = ({ single, double, escaped, plain }: ShellPiece) =>
  single ??
  escaped ??
  plain ??
  (double ?? '').replace(doubleQuoteEscape, (_match, character: string) =>
    character === '\n' ? '' : character,
  );

/** Zerlegt eine Zeile in Wörter wie eine POSIX-Shell, ohne etwas zu expandieren. */
export const splitShellWords = (line: string): Array<string> | UsageError => {
  const words: Array<string> = [];
  const pieces = shellPiece();
  let word: string | undefined;
  while (pieces.lastIndex < line.length) {
    const at = pieces.lastIndex;
    const piece: ShellPiece | undefined = pieces.exec(line)?.groups;
    if (piece === undefined) {
      // Nur ein offenes Anführungszeichen oder ein Backslash am Ende passt auf nichts.
      return new UsageError({
        message:
          line.charAt(at) === '\\'
            ? 'The command line ends in a backslash.'
            : 'The command line has a quote that is never closed.',
      });
    }
    if (piece.blank !== undefined && word !== undefined) {
      words.push(word);
      word = undefined;
    } else if (piece.blank === undefined && piece.continuation === undefined) {
      word = (word ?? '') + wordPartOf(piece);
    }
  }
  if (word !== undefined) {
    words.push(word);
  }
  return words;
};
