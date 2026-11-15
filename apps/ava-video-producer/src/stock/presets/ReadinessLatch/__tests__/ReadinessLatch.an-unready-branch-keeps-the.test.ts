import assert from "node:assert/strict";
import test from "node:test";
import { SvgAttributes } from "../../../../../tests/helpers/SvgAttributes";
import { fixtures } from "../ReadinessLatch.fixtures";
import {
  _render,
  _getAttributesFromMarkup,
  _getResultBoundsFromMarkup,
} from "./ReadinessLatchTestHelpers";

test("an unready branch keeps the complete result upstream in each orientation", () => {
  (["horizontal", "vertical"] as const).forEach((orientation) => {
    const input = { ...fixtures[3].input, orientation };
    [24, 112, 122, 130, 146, 166].forEach((frame) => {
      const markup = _render({ frame, input });
      const bounds = _getResultBoundsFromMarkup(markup);
      assert.ok(
        orientation === "horizontal" ? bounds.right < 650 : bounds.bottom < 400,
      );
      const before = _getAttributesFromMarkup({
        markup,
        id: "before",
        kind: "gate",
      });
      const after = _getAttributesFromMarkup({
        markup,
        id: "after",
        kind: "gate",
      });
      assert.equal(
        SvgAttributes.getNumberFromMarkup({
          attributes: before,
          name: orientation === "horizontal" ? "y2" : "x2",
        }),
        SvgAttributes.getNumberFromMarkup({
          attributes: after,
          name: orientation === "horizontal" ? "y1" : "x1",
        }),
      );
    });
  });
});
