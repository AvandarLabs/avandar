/**
 * Removes exactly one explicit content marker pair and preserves UTF-16
 * offsets.
 * Marker-looking text is interpreted only in declared default templates.
 */
export function decodeDefaultSpan(template: string): {
  text: string;
  contentStart: number;
  contentEnd: number;
} {
  const opening = "<content>",
    closing = "</content>";
  const start = template.indexOf(opening),
    end = template.indexOf(closing);
  if (
    start < 0 ||
    end < start + opening.length ||
    template.indexOf(opening, start + opening.length) >= 0 ||
    template.indexOf(closing, end + closing.length) >= 0
  ) {
    throw new Error(
      "A default span template requires exactly one ordered <content> pair.",
    );
  }
  const prefix = template.slice(0, start),
    content = template.slice(start + opening.length, end),
    suffix = template.slice(end + closing.length);
  return {
    text: `${prefix}${content}${suffix}`,
    contentStart: prefix.length,
    contentEnd: prefix.length + content.length,
  };
}
