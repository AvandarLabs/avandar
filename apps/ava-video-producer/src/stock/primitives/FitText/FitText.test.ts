/**
 * Wrapping rejects overflow instead of shrinking or truncating authored labels.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { FitText } from "./FitText";
import { wrapTextToLines } from "./wrapTextToLines";

test("supported fixed sizes wrap deterministically at the declared line bound", () => {
  const options = {
    text: "Maximum supported label",
    width: 400,
    fontSize: 24 as const,
    maxLines: 1,
  };
  assert.deepEqual(wrapTextToLines(options), ["Maximum supported label"]);
  const wrapped = wrapTextToLines({
    ...options,
    text: "One authored line and another line",
    width: 230,
    maxLines: 3,
  });
  assert.deepEqual(wrapped, ["One authored", "line and", "another line"]);
  assert.equal(wrapped.join(" "), "One authored line and another line");
  assert.deepEqual(wrapTextToLines(options), ["Maximum supported label"]);
});

test("unbreakable and excess-line content fail explicitly", () => {
  assert.throws(
    () =>
      wrapTextToLines({
        text: "W".repeat(30),
        width: 220,
        fontSize: 24,
        maxLines: 3,
      }),
    /fit/i,
  );
  assert.throws(
    () =>
      wrapTextToLines({
        text: "one\ntwo\nthree",
        width: 220,
        fontSize: 24,
        maxLines: 2,
      }),
    /fit/i,
  );
  [0, NaN, Infinity, -1].forEach((width) =>
    assert.throws(() =>
      wrapTextToLines({ text: "label", width, fontSize: 24, maxLines: 2 }),
    ),
  );
  assert.throws(
    () =>
      wrapTextToLines({
        text: "label",
        width: 220,
        fontSize: 17 as 24,
        maxLines: 2,
      }),
    /size/i,
  );
});

test("FitText retains fixed font size and every wrapped line in SVG", () => {
  const markup = renderToStaticMarkup(
    createElement(
      "svg",
      null,
      createElement(FitText, {
        text: "One line\nAnother line",
        x: 20,
        y: 30,
        width: 240,
        fontSize: 24,
        maxLines: 2,
      }),
    ),
  );
  assert.match(markup, /font-size="24"/);
  assert.match(markup, />One line<\/tspan>/);
  assert.match(markup, />Another line<\/tspan>/);
  assert.equal((markup.match(/<tspan/g) ?? []).length, 2);
});

test("lowercase wide glyphs cannot pass a narrower single-line width", () => {
  assert.throws(
    () =>
      wrapTextToLines({
        text: "mmmmmmmmmm",
        width: 120,
        fontSize: 16,
        maxLines: 1,
      }),
    /fit/,
  );
  assert.throws(
    () =>
      wrapTextToLines({
        text: "m".repeat(16),
        width: 180,
        fontSize: 16,
        maxLines: 2,
      }),
    /fit/,
  );
  assert.deepEqual(
    wrapTextToLines({
      text: "mmmm mmmm",
      width: 120,
      fontSize: 16,
      maxLines: 2,
    }),
    ["mmmm", "mmmm"],
  );
});

test("mixed-case widths cover the supported regular and bold Arial advances", () => {
  assert.throws(
    () =>
      wrapTextToLines({
        text: "mmWmmWmm",
        width: 110,
        fontSize: 16,
        maxLines: 1,
      }),
    /fit/,
  );
  assert.deepEqual(
    wrapTextToLines({
      text: "mmWmmWmm",
      width: 160,
      fontSize: 16,
      maxLines: 1,
    }),
    ["mmWmmWmm"],
  );
});

test("opt-in oversized-token wrapping preserves fitting words and complete wide labels", () => {
  const lines = wrapTextToLines({
    text: "Keep words intact",
    width: 130,
    fontSize: 18,
    maxLines: 3,
    breakLongWords: true,
  });
  assert.deepEqual(lines, ["Keep words", "intact"]);
  [
    { length: 34, width: 310, fontSize: 18 as const, maxLines: 3 },
    { length: 18, width: 176, fontSize: 14 as const, maxLines: 2 },
    { length: 32, width: 350, fontSize: 18 as const, maxLines: 2 },
  ].forEach(({ length, ...bounds }) => {
    const text = "界".repeat(length);
    const wrapped = wrapTextToLines({ ...bounds, text, breakLongWords: true });
    assert.equal(wrapped.join(""), text);
    assert.ok(wrapped.length <= bounds.maxLines);
  });
});

test("opt-in wrapping still rejects exhausted line capacity and a too-wide glyph", () => {
  assert.throws(
    () =>
      wrapTextToLines({
        text: "界".repeat(34),
        width: 100,
        fontSize: 18,
        maxLines: 2,
        breakLongWords: true,
      }),
    /fit/,
  );
  assert.throws(
    () =>
      wrapTextToLines({
        text: "界",
        width: 1,
        fontSize: 18,
        maxLines: 4,
        breakLongWords: true,
      }),
    /fit/,
  );
});

test("opt-in label whitespace normalization fits hard breaks without changing strict paragraphs", () => {
  const text = "A\nB\tC\r\nD";
  assert.deepEqual(
    wrapTextToLines({
      text,
      width: 200,
      fontSize: 18,
      maxLines: 1,
      normalizeWhitespace: true,
    }),
    ["A B C D"],
  );
  assert.throws(
    () => wrapTextToLines({ text, width: 200, fontSize: 18, maxLines: 1 }),
    /line count/,
  );
  const markup = renderToStaticMarkup(
    createElement(FitText, {
      text,
      x: 0,
      y: 20,
      width: 200,
      fontSize: 18,
      maxLines: 1,
      normalizeWhitespace: true,
    }),
  );
  assert.ok(markup.includes(`aria-label="${text}"`));
  assert.match(markup, />A B C D<\/tspan>/);
});

test("oversized wrapping keeps each combining letter and joined emoji in one grapheme", () => {
  const text = `${"界".repeat(8)}é`;
  const lines = wrapTextToLines({
    text,
    width: 144,
    fontSize: 14,
    maxLines: 3,
    breakLongWords: true,
  });
  assert.deepEqual(lines, [text]);
  const emoji = "👩🏽‍💻";
  assert.deepEqual(
    wrapTextToLines({
      text: emoji.repeat(3),
      width: 50,
      fontSize: 14,
      maxLines: 3,
      breakLongWords: true,
    }),
    [emoji, emoji, emoji],
  );
  assert.deepEqual(
    wrapTextToLines({
      text: "e\u0301",
      width: 12,
      fontSize: 14,
      maxLines: 1,
      breakLongWords: true,
    }),
    ["e\u0301"],
  );
});

test("a whole grapheme wider than its slot fails instead of separating emoji parts", () => {
  assert.throws(
    () =>
      wrapTextToLines({
        text: "👩🏽‍💻",
        width: 20,
        fontSize: 14,
        maxLines: 4,
        breakLongWords: true,
      }),
    /grapheme.*fit/i,
  );
});

test("keycap emoji retain a whole fallback glyph advance after marks are removed", () => {
  assert.throws(
    () =>
      wrapTextToLines({
        text: "1️⃣",
        width: 12,
        fontSize: 14,
        maxLines: 4,
        breakLongWords: true,
      }),
    /grapheme.*fit/i,
  );
});

test("oversized tokens fill residual line capacity while fitting words and graphemes stay intact", () => {
  const wide = (length: number) => "界".repeat(length);
  const emoji = "👩🏽‍💻";
  const accent = "e\u0301";
  const cases = [
    {
      text: `${wide(1)} ${wide(4)}`,
      width: 60,
      lines: [`${wide(1)} ${wide(2)}`, wide(2)],
    },
    {
      text: `${wide(2)} ${wide(4)}`,
      width: 60,
      lines: [`${wide(2)} ${wide(1)}`, wide(3)],
    },
    {
      text: `${wide(3)} ${wide(4)}`,
      width: 60,
      lines: [wide(3), wide(3), wide(1)],
    },
    {
      text: `${wide(1)} ${wide(7)}`,
      width: 60,
      lines: [`${wide(1)} ${wide(2)}`, wide(3), wide(2)],
    },
    {
      text: `${wide(1)} ${wide(4)} ok`,
      width: 60,
      lines: [`${wide(1)} ${wide(2)}`, `${wide(2)} ok`],
    },
    {
      text: `ok ${wide(4)} ${wide(1)}`,
      width: 60,
      lines: [`ok ${wide(2)}`, `${wide(2)} ${wide(1)}`],
    },
    {
      text: `${wide(1)} ${wide(4)} word`,
      width: 60,
      lines: [`${wide(1)} ${wide(2)}`, wide(2), "word"],
    },
    {
      text: `${wide(1)} ${emoji.repeat(3)}`,
      width: 80,
      lines: [`${wide(1)} ${emoji}`, emoji.repeat(2)],
    },
    {
      text: `${wide(1)} ${accent.repeat(8)}`,
      width: 60,
      lines: [`${wide(1)} ${accent.repeat(3)}`, accent.repeat(5)],
    },
  ];
  cases.forEach(({ text, width, lines }) => {
    const actual = wrapTextToLines({
      text,
      width,
      fontSize: 14,
      maxLines: lines.length,
      breakLongWords: true,
    });
    assert.deepEqual(actual, lines, text);
    assert.equal(actual.join("").replace(/\s/g, ""), text.replace(/\s/g, ""));
  });
  assert.throws(
    () =>
      wrapTextToLines({
        text: `${wide(1)} ${wide(4)}`,
        width: 60,
        fontSize: 14,
        maxLines: 4,
      }),
    /unbreakable/,
  );
});

test("seven and eight authored lines retain fixed-size leading within explicit capacity", () => {
  [7, 8].forEach((numLines) => {
    const text = Array.from(
      { length: numLines },
      (_, index) => `Line ${index + 1}`,
    ).join("\n");
    const lines = wrapTextToLines({
      text,
      width: 368,
      fontSize: 14,
      maxLines: numLines,
    });
    assert.equal(lines.length, numLines);
    const markup = renderToStaticMarkup(
      createElement(FitText, {
        text,
        width: 368,
        fontSize: 14,
        maxLines: numLines,
        x: 0,
        y: 14,
      }),
    );
    assert.equal((markup.match(/<tspan/g) ?? []).length, numLines);
    assert.equal((markup.match(/dy="18.2"/g) ?? []).length, numLines - 1);
    assert.match(markup, /font-size="14"/);
  });
});
test("nine-line capacity and content beyond eight lines still fail explicitly", () => {
  assert.throws(
    () =>
      wrapTextToLines({ text: "One", width: 368, fontSize: 14, maxLines: 9 }),
    /one to eight lines/,
  );
  assert.throws(
    () =>
      wrapTextToLines({
        text: Array(9).fill("Line").join("\n"),
        width: 368,
        fontSize: 14,
        maxLines: 8,
      }),
    /line count/,
  );
});
