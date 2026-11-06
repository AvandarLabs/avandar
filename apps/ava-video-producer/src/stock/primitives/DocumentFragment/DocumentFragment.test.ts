/** Authored fragments retain their alignment and complete bounded text. */
import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DocumentFragment } from "./DocumentFragment";

test("a fragment retains its supplied anchor and complete label", () => {
  const markup = renderToStaticMarkup(
    createElement(
      "svg",
      null,
      createElement(DocumentFragment, {
        x: 120,
        y: 80,
        width: 240,
        text: "An authored fragment",
        emphasized: true,
      }),
    ),
  );
  assert.match(markup, /x="120" y="80" width="240"/);
  assert.match(markup, />An authored fragment</);
  assert.match(markup, /font-size="16"/);
});
test("a fragment rejects excessive text and unsupported stage bounds", () => {
  assert.throws(() =>
    renderToStaticMarkup(
      createElement(DocumentFragment, {
        x: 0,
        y: 0,
        width: 120,
        text: "W".repeat(40),
      }),
    ),
  );
  [NaN, 40, 900].forEach((width) =>
    assert.throws(() =>
      renderToStaticMarkup(
        createElement(DocumentFragment, { x: 0, y: 0, width, text: "label" }),
      ),
    ),
  );
});

test("wide lowercase text is rejected before escaping the inner cell width", () => {
  assert.throws(
    () =>
      renderToStaticMarkup(
        createElement(DocumentFragment, {
          x: 0,
          y: 0,
          width: 200,
          text: "m".repeat(16),
        }),
      ),
    /fit/,
  );
});
