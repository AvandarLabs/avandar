import type { TextItem } from "../pdfSniff.types";

import { describe, expect, it } from "vitest";

import { assembleWords } from "./assembleWords";

function glyph(text: string, x: number, y = 100, width = 6): TextItem {
  return {
    text,
    x,
    y,
    width,
    height: 10,
    fontName: "f1",
    unmappedCharRatio: 0,
  };
}

describe("assembleWords", () => {
  it("leaves items that already contain spaces alone", () => {
    // The common case. Most generators emit whole words or whole lines, and
    // re-splitting them would be a regression.
    const items = [glyph("Deaths by state", 100, 100, 60)];
    expect(assembleWords(items)).toEqual(items);
  });

  it("joins adjacent glyphs into one word", () => {
    const items = [
      glyph("K", 100),
      glyph("h", 106),
      glyph("a", 112),
      glyph("r", 118),
    ];

    const words = assembleWords(items);

    expect(words).toHaveLength(1);
    expect(words[0]!.text).toBe("Khar");
    expect(words[0]!.x).toBe(100);
  });

  it("splits on a gap wide enough to be a space", () => {
    // 6pt glyphs on a 10pt font: a 5pt gap is a space, a 0pt gap is not.
    const items = [
      glyph("R", 100),
      glyph("e", 106),
      glyph("d", 112),
      glyph("S", 123),
      glyph("e", 129),
      glyph("a", 135),
    ];

    const words = assembleWords(items);

    expect(
      words.map((w) => {
        return w.text;
      }),
    ).toEqual(["Red", "Sea"]);
  });

  it("spans the full width of the assembled word", () => {
    const items = [glyph("a", 100), glyph("b", 106), glyph("c", 112)];

    const [word] = assembleWords(items);

    // Left edge of the first glyph to right edge of the last.
    expect(word!.x).toBe(100);
    expect(word!.width).toBeCloseTo(18, 5);
  });

  it("does not join glyphs on different lines", () => {
    const items = [glyph("a", 100, 200), glyph("b", 106, 100)];

    const words = assembleWords(items);

    expect(words).toHaveLength(2);
  });

  it("does not join glyphs in different fonts", () => {
    // A bold run-in label followed by body text is two words even with no
    // gap, and the repeating-block parser depends on that boundary surviving.
    const items = [
      { ...glyph("a", 100), fontName: "bold" },
      { ...glyph("b", 106), fontName: "body" },
    ];

    const words = assembleWords(items);

    expect(words).toHaveLength(2);
  });

  it("preserves the worst unmapped-character ratio in the run", () => {
    const items = [
      { ...glyph("8", 100), unmappedCharRatio: 0 },
      { ...glyph("", 106), unmappedCharRatio: 1 },
      { ...glyph("7", 112), unmappedCharRatio: 0 },
    ];

    const [word] = assembleWords(items);

    // Losing this would let a broken ToUnicode map through the guard.
    expect(word!.unmappedCharRatio).toBe(1);
  });
});
