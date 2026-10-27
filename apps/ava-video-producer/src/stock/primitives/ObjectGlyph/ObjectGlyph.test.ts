/** Every supported object is a local, deterministic SVG silhouette. */
import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ObjectGlyph } from "./ObjectGlyph";

test("object kinds produce distinct self-contained geometry", () => {
  const outputs = (
    [
      "document",
      "box",
      "resource",
      "tool",
      "building",
      "device",
      "token",
    ] as const
  ).map((kind) =>
    renderToStaticMarkup(
      createElement(
        "svg",
        null,
        createElement(ObjectGlyph, { kind, x: 40, y: 20, size: 48 }),
      ),
    ),
  );
  assert.equal(new Set(outputs).size, 7);
  outputs.forEach((markup) => {
    assert.match(markup, /<path/);
    assert.doesNotMatch(markup, /image|href|NaN|Infinity/);
  });
});

test("nonfinite placement and unsupported sizes fail", () => {
  assert.throws(() =>
    renderToStaticMarkup(
      createElement(ObjectGlyph, { kind: "box", x: Infinity, y: 0 }),
    ),
  );
  assert.throws(() =>
    renderToStaticMarkup(
      createElement(ObjectGlyph, { kind: "box", x: 0, y: 0, size: 2 }),
    ),
  );
});
