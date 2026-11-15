/**
 * Table cells never infer values or discard missingness supplied by the caller.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TableCell } from "./TableCell";

test("cell placement, explicit missing label and two-line text remain visible", () => {
  const markup = renderToStaticMarkup(
    createElement(
      "svg",
      null,
      createElement(TableCell, {
        x: 20,
        y: 40,
        width: 220,
        text: "Missing by author",
        highlighted: true,
      }),
    ),
  );
  assert.match(markup, /x="20" y="40" width="220" height="64"/);
  assert.match(markup, />Missing by author</);
  assert.doesNotMatch(markup, /undefined|null/);
});
test("table cells reject unreadable overflow and invalid dimensions", () => {
  assert.throws(() =>
    renderToStaticMarkup(
      createElement(TableCell, {
        x: 0,
        y: 0,
        width: 120,
        text: "W".repeat(24),
      }),
    ),
  );
  assert.throws(() =>
    renderToStaticMarkup(
      createElement(TableCell, {
        x: Infinity,
        y: 0,
        width: 120,
        text: "value",
      }),
    ),
  );
});

test("wide lowercase text is rejected before escaping the inner cell width", () => {
  assert.throws(
    () =>
      renderToStaticMarkup(
        createElement(TableCell, {
          x: 0,
          y: 0,
          width: 200,
          text: "m".repeat(16),
        }),
      ),
    /fit/,
  );
});
