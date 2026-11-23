import assert from "node:assert/strict";

type SvgLabelElement = {
  tag: string;
  openingTag: string;
  body: string;
  ancestorOpeningTags: string[];
};

type OpenElement = {
  tag: string;
  openingTag: string;
  start: number;
  ancestorOpeningTags: string[];
};

/** Reads complete text and group elements from balanced static SVG markup. */
export function getSvgLabelElementsFromMarkup(
  markup: string,
): SvgLabelElement[] {
  const elements: SvgLabelElement[] = [];
  const openElements: OpenElement[] = [];
  Array.from(markup.matchAll(/<\/?([A-Za-z][\w:-]*)\b[^>]*>/g)).forEach(
    (match) => {
      const [token, tag] = match;
      if (token.startsWith("</")) {
        const opened = openElements.pop();
        assert.ok(
          opened && opened.tag === tag,
          "Unbalanced static SVG markup.",
        );
        if (tag === "g" || tag === "text") {
          elements.push({
            tag,
            openingTag: opened.openingTag,
            body: markup.slice(opened.start, match.index),
            ancestorOpeningTags: opened.ancestorOpeningTags,
          });
        }
      } else if (!token.endsWith("/>")) {
        openElements.push({
          tag,
          openingTag: token,
          start: match.index + token.length,
          ancestorOpeningTags: openElements.map((element) => {
            return element.openingTag;
          }),
        });
      }
    },
  );
  assert.equal(openElements.length, 0, "Unclosed static SVG element.");
  return elements;
}
