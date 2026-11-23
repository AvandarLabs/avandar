import { QueueReliefTestState } from "./QueueReliefTestState";

const { render, items: _items } = QueueReliefTestState;

import assert from "node:assert/strict";
import { SvgAttributes } from "../../../../../../tests/helpers/SvgAttributes";
import { fixtures } from "../../QueueRelief.fixtures";

/**
 * Asserts actual bay outlines unfold and all dense item bounds fit setup
 * travel and final trays.
 */
export function assertActualBayOutlinesUnfoldDocument(
  document: NonNullable<typeof fixtures>[number]["input"],
): void {
  return Array.from({ length: 139 }, (_, frame) => {
    return frame;
  }).forEach((frame) => {
    return _items(render({ frame: frame, input: document })).forEach((rect) => {
      const x = SvgAttributes.getNumberFromMarkup({
          attributes: rect,
          name: "x",
        }),
        y = SvgAttributes.getNumberFromMarkup({ attributes: rect, name: "y" });
      assert.ok(
        x >= 0 &&
          x +
            SvgAttributes.getNumberFromMarkup({
              attributes: rect,
              name: "width",
            }) <=
            960,
      );
      assert.ok(
        y >= 0 &&
          y +
            SvgAttributes.getNumberFromMarkup({
              attributes: rect,
              name: "height",
            }) <=
            600,
      );
    });
  });
}
