/**
 * FitText draws wrapped labels with fixed font size and themed colour and spacing.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { VideoThemeScope } from "../../../../videoTheme/VideoThemeScope/VideoThemeScope";
import { FitText } from "../FitText";
import { wrapTextToLines } from "../wrapTextToLines";

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

test("fitted text takes its colour and line spacing from the data role", () => {
  const patch = {
    lineHeights: { md: "1.5" },
    other: { video: { atomic: { swatch: { text: "#ffeedd" } } } },
  };
  const markup = renderToStaticMarkup(
    createElement(VideoThemeScope, {
      patches: [patch],
      children: createElement(FitText, {
        text: "one two three four",
        x: 0,
        y: 0,
        width: 50,
        fontSize: 12,
        maxLines: 4,
      }),
    }),
  );
  assert.match(markup, /fill="#ffeedd"/);
  assert.match(markup, /dy="18"/);
});
