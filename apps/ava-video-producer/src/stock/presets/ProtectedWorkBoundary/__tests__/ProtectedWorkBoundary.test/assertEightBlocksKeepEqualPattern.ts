import { ProtectedWorkBoundaryTestState } from "./ProtectedWorkBoundaryTestState";

const { render: _render } = ProtectedWorkBoundaryTestState;

import assert from "node:assert/strict";
import { SvgAttributes } from "../../../../../../tests/helpers/SvgAttributes";
import { fixtures } from "../../ProtectedWorkBoundary.fixtures";
import { inputSchema, type Input } from "../../ProtectedWorkBoundary.schema";

/**
 * Asserts all eight blocks keep equal size across both patterns and every
 * disposition frame.
 */
export function assertEightBlocksKeepEqualPattern(pattern: string): void {
  const input = {
    ...fixtures[2].input,
    protectedPattern: pattern as Input["protectedPattern"],
    showSlotLabels: false,
    request: {
      ...fixtures[2].input.request,
      placement: "reschedule" as const,
      agreedSlotId: "slot-1",
    },
  };
  assert.equal(inputSchema.safeParse(input).success, true);
  [0, 38, 76, 104.5, 105, 129.5, 130, 150].forEach((frame) => {
    const rectangles = Array.from(
      _render({ frame: frame, input: input }).matchAll(
        /data-slot-body="[^"]+"[^>]+/g,
      ),
    );
    assert.equal(rectangles.length, 8);
    rectangles.forEach((rectangle, index) => {
      assert.equal(
        SvgAttributes.getNumberFromMarkup({
          attributes: rectangle[0],
          name: "x",
        }),
        50 + index * 107.5,
      );
      assert.equal(
        SvgAttributes.getNumberFromMarkup({
          attributes: rectangle[0],
          name: "width",
        }),
        107.5,
      );
      assert.equal(
        SvgAttributes.getNumberFromMarkup({
          attributes: rectangle[0],
          name: "height",
        }),
        300,
      );
    });
  });
}
