import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LabelSlots } from "./LabelSlots";

test("label slots preserve authored whitespace while wrapping whole joined graphemes at fixed size", () => {
  const text = " A\nB\tC ";
  const emoji = "👩🏽‍💻";
  const markup = renderToStaticMarkup(
    createElement(
      "svg",
      {},
      createElement(LabelSlots, {
        labels: [
          [text, 20, 30, 100, 14, 1],
          [emoji.repeat(2), 20, 60, 40, 14, 2],
        ],
      }),
    ),
  );
  assert.ok(markup.includes(`aria-label="${text}"`));
  assert.match(markup, />A B C<\/tspan>/);
  assert.equal((markup.match(/font-size="14"/g) ?? []).length, 2);
  assert.equal((markup.match(/>👩🏽‍💻<\/tspan>/gu) ?? []).length, 2);
  assert.match(markup, /dy="18.2"/);
});

test("label slots reject exhausted line capacity instead of dropping or shrinking graphemes", () => {
  assert.throws(
    () =>
      renderToStaticMarkup(
        createElement(LabelSlots, {
          labels: [["界界界", 20, 30, 16, 14, 2]],
        }),
      ),
    /line count/,
  );
});
