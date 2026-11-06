/** Membership presentation follows only the caller's explicit state. */
import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MembershipMarker } from "./MembershipMarker";

test("included, excluded and unknown states remain distinct without inferred membership", () => {
  const outputs = (["included", "excluded", "unknown"] as const).map(
    (membership) =>
      renderToStaticMarkup(
        createElement(
          "svg",
          null,
          createElement(MembershipMarker, { x: 20, y: 30, membership }),
        ),
      ),
  );
  assert.equal(new Set(outputs).size, 3);
  outputs.forEach((markup) =>
    assert.doesNotMatch(markup, /NaN|Infinity|image|href/),
  );
});
test("invalid placement is rejected before SVG output", () => {
  assert.throws(() =>
    renderToStaticMarkup(
      createElement(MembershipMarker, { x: NaN, y: 0, membership: "included" }),
    ),
  );
});
