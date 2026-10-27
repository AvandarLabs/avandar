import { prop } from "@avandar/utils";
function _decodeAttributeValue(value: string): string {
  return value.replace(/&([^;]+);/g, (_, entity: string) => {
    const named: Record<string, string> = {
      amp: "&",
      quot: '"',
      apos: "'",
      lt: "<",
      gt: ">",
    };
    if (Object.hasOwn(named, entity)) {
      return named[entity];
    }
    if (!/^#(?:x[\da-f]+|\d+)$/i.test(entity)) {
      throw new Error("Unsupported SVG attribute entity.");
    }
    const isHex = entity[1].toLowerCase() === "x";
    const codePoint = Number.parseInt(
      entity.slice(isHex ? 2 : 1),
      isHex ? 16 : 10,
    );
    if (codePoint > 0x10ffff) {
      throw new Error("Invalid SVG attribute code point.");
    }
    return String.fromCodePoint(codePoint);
  });
}
/**
 * Read exact quoted attributes from static SVG opening tags in document order.
 * Comments and text are ignored. Values decode the five XML and numeric
 * entities
 * once, while tags retain their exact source. This is a test-only bounded
 * reader,
 * not a browser DOM or general XML validator.
 */
export function getSvgAttributeMatchesFromMarkup({
  markup,
  attribute,
}: Readonly<{ markup: string; attribute: string }>): {
  tags: string[];
  values: string[];
} {
  if (!/^[A-Za-z_][\w:.-]*$/.test(attribute)) {
    throw new Error("Invalid SVG attribute selector.");
  }
  const tags =
    markup
      .replace(/<!--[\s\S]*?-->/g, "")
      .match(/<[A-Za-z][^<>"']*(?:(?:"[^"]*"|'[^']*')[^<>"']*)*>/g) ?? [];
  const matches = tags.flatMap((tag) => {
    const attributes = Array.from(
      tag.matchAll(/(?:^|\s)([\w:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g),
    );
    const match = attributes.find((item) => item[1] === attribute);
    return match
      ? [{ tag, value: _decodeAttributeValue(match[2] ?? match[3]) }]
      : [];
  });
  return {
    tags: matches.map(prop("tag")),
    values: matches.map(prop("value")),
  };
}
