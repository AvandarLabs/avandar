/**
 * Typographic characters rewritten to an ASCII equivalent before printing.
 *
 * The exported page uses jsPDF's built-in Helvetica, whose encoding is WinAnsi.
 * A character outside WinAnsi does not print as itself: `≥` comes out as `"e`,
 * which turns a legend class such as `≥ 238` into nonsense on the one artifact
 * a reader is meant to keep. The on-screen legend keeps the typographic form,
 * so the rewrite belongs here rather than in the label the classifier builds.
 *
 * Only characters a map's furniture actually produces are listed. The
 * comparison signs come from graduated class labels; the dashes, quotes and
 * ellipsis come from titles, source lines, and disclaimers a user types.
 */
const ASCII_REPLACEMENTS: ReadonlyArray<readonly [RegExp, string]> = [
  [/≥/g, ">="], // ≥
  [/≤/g, "<="], // ≤
  [/≠/g, "!="], // ≠
  [/−/g, "-"], // − minus sign
  [/[–—]/g, "-"], // – en dash, — em dash
  [/…/g, "..."], // …
  [/\u00a0/g, " "], // non-breaking space
];

/**
 * Whether WinAnsi can encode `character`.
 *
 * WinAnsi covers Latin-1 apart from the C1 range, which it reuses for the
 * printable characters at 0x80-0x9F (curly quotes, dashes, the euro sign), plus
 * three code points that sit outside Latin-1 entirely.
 */
function _isWinAnsiEncodable(character: string): boolean {
  const code = character.codePointAt(0);
  if (code === undefined) {
    return false;
  }
  if (code >= 0x20 && code <= 0x7e) {
    return true;
  }
  if (code >= 0xa0 && code <= 0xff) {
    return true;
  }
  // The printable characters WinAnsi places in the C1 range.
  const C1_RANGE_CHARACTERS = "€‚ƒ„…†‡ˆ‰Š‹" + "ŒŽ‘’“”•–—˜™" + "š›œžŸ";
  return C1_RANGE_CHARACTERS.includes(character);
}

/**
 * Returns `text` with every character the export font cannot print replaced.
 *
 * Known typographic characters become their ASCII equivalent; anything else
 * outside the font's encoding becomes `?`. A visible `?` is deliberate: a
 * dropped character would silently shorten a label, and a mojibake one would
 * look like data.
 */
export function toPdfSafeText(text: string): string {
  const rewritten = ASCII_REPLACEMENTS.reduce(
    (current, [pattern, replacement]) => {
      return current.replace(pattern, replacement);
    },
    text,
  );
  return [...rewritten]
    .map((character) => {
      return _isWinAnsiEncodable(character) ? character : "?";
    })
    .join("");
}
