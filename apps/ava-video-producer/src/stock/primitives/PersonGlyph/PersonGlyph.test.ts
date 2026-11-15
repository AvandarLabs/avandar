/** Person presentations expose roles and posture without demographic data. */
import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PersonGlyph } from "./PersonGlyph";

test("postures use distinct local SVG geometry with role-only badges", () => {
  const outputs = (["standing", "seated", "walking"] as const).map((posture) =>
    renderToStaticMarkup(
      createElement(
        "svg",
        null,
        createElement(PersonGlyph, {
          x: 30,
          y: 40,
          size: 48,
          posture,
          role: "participant",
          color: "#9fefca",
        }),
      ),
    ),
  );
  assert.equal(new Set(outputs).size, 3);
  outputs.forEach((markup) => {
    assert.match(markup, /<circle/);
    assert.match(markup, /<path/);
    assert.doesNotMatch(markup, /image|href|NaN|Infinity/);
  });
  const worker = renderToStaticMarkup(
    createElement(
      "svg",
      null,
      createElement(PersonGlyph, { x: 30, y: 40, role: "worker" }),
    ),
  );
  assert.notEqual(worker, outputs[0]);
});

test("invalid glyph dimensions fail before emitting geometry", () => {
  [0, Infinity, NaN, -10, 161].forEach((size) =>
    assert.throws(() =>
      renderToStaticMarkup(createElement(PersonGlyph, { x: 0, y: 0, size })),
    ),
  );
});
