const NAMED_ENTITIES: Readonly<Record<string, string>> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

const LINK_PATTERN =
  /<a\b[^>]*\bhref\s*=\s*["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;

function _decodeEntity(entity: string, code: string): string {
  if (/^#x/i.test(code)) {
    return String.fromCodePoint(Number.parseInt(code.slice(2), 16));
  }
  if (code.startsWith("#")) {
    return String.fromCodePoint(Number(code.slice(1)));
  }
  return NAMED_ENTITIES[code.toLowerCase()] ?? entity;
}

function _replaceLinks(html: string): string {
  return html.replace(LINK_PATTERN, (_link, href: string, inner: string) => {
    const linkText = inner.replace(/<[^>]*>/g, "").trim();
    return linkText === "" || linkText === href ? href : `${linkText} (${href})`;
  });
}

/**
 * Source HTML as readable plain text, for a mapper script whose source
 * stores markup in a text field. A link keeps its text with its URL after
 * it, a line break or the end of a paragraph, heading, or list item becomes
 * a new line, a list item starts with a dash, every other tag is dropped,
 * and entities are decoded. Blank lines collapse to one.
 *
 * This is not a sanitizer: the catalog only ever renders the result as
 * text.
 *
 * @param html - Text that may carry HTML tags and entities.
 * @returns The text, without tags.
 */
export function htmlToPlainText(html: string): string {
  const withLines = _replaceLinks(html)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<li\b[^>]*>/gi, "- ")
    .replace(/<\/(p|div|li|h[1-6])>/gi, "\n");
  const text = withLines
    .replace(/<[^>]*>/g, "")
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, _decodeEntity);
  return text
    .split("\n")
    .map((line) => {
      return line.replace(/[ \t]+/g, " ").trim();
    })
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
