import assert from "node:assert/strict";

/** Marks text-bearing ancestors after validating balanced SVG traversal. */
export function getTextRelevantTokenIndicesFromTokens({
  tokens,
  extraTags = [],
}: Readonly<{
  tokens: readonly string[];
  extraTags?: readonly string[];
}>): Set<number> {
  const stack: Array<{ tag: string; index: number; isInert: boolean }> = [];
  const relevant = new Set<number>();
  tokens.forEach((token, index) => {
    if (!token.startsWith("<") || token.startsWith("<!--")) {
      return;
    }
    const closing = token.match(/^<\/([\w:-]+)>$/);
    if (closing) {
      assert.equal(stack.pop()?.tag, closing[1], "Unbalanced SVG markup.");
      return;
    }
    const opening = token.match(/^<([\w:-]+)\b/);
    assert.ok(opening, "Unsupported SVG markup token.");
    const tag = opening[1];
    const isInert =
      Boolean(stack.at(-1)?.isInert) ||
      ["defs", "clipPath", "mask", "symbol"].includes(tag);
    if (
      !isInert &&
      [
        "text",
        "tspan",
        "use",
        "foreignObject",
        "textPath",
        ...extraTags,
      ].includes(tag)
    ) {
      relevant.add(index);
      stack.forEach((ancestor) => relevant.add(ancestor.index));
    }
    if (!token.endsWith("/>")) {
      stack.push({ tag, index, isInert });
    }
  });
  assert.equal(stack.length, 0, "Unbalanced SVG markup.");
  return relevant;
}
