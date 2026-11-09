/** A gadget's real name and the text that takes its place. */
export type GadgetNameReplacement = Readonly<{
  name: string;
  replacement: string;
}>;

function _escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * The text with every gadget name swapped for its replacement: whole words
 * only (by Unicode letters, digits, and `_`), ignoring case, and longest
 * names first, in one pass so a replacement is never replaced again. Blank
 * names are skipped. Used to keep the real names an offline reply quoted
 * out of what a hosted model reads.
 */
export function replaceGadgetNames(
  text: string,
  replacements: readonly GadgetNameReplacement[],
): string {
  const byName = new Map<string, string>();
  replacements.forEach(({ name, replacement }) => {
    const key = name.trim().toLowerCase();
    if (key !== "" && !byName.has(key)) {
      byName.set(key, replacement);
    }
  });
  if (byName.size === 0) {
    return text;
  }
  const alternatives = [...byName.keys()]
    .sort((left, right) => {
      return right.length - left.length;
    })
    .map(_escapeRegExp);
  const pattern = new RegExp(
    `(?<![\\p{L}\\p{N}_])(?:${alternatives.join("|")})(?![\\p{L}\\p{N}_])`,
    "giu",
  );
  return text.replace(pattern, (match) => {
    return byName.get(match.toLowerCase()) ?? _findByFoldedName(byName, match);
  });
}

/**
 * The replacement for a match whose lower case differs from its name's,
 * which Unicode case folding allows (such as `ß` and `SS`). Never the
 * match itself.
 */
function _findByFoldedName(
  byName: ReadonlyMap<string, string>,
  match: string,
): string {
  const entry = [...byName.entries()].find(([name]) => {
    return new RegExp(`^${_escapeRegExp(name)}$`, "iu").test(match);
  });
  return entry?.[1] ?? "";
}
