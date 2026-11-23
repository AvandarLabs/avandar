import { WorkDecompositionTestState } from "./WorkDecompositionTestState";

const { pieces: _pieces } = WorkDecompositionTestState;

import assert from "node:assert/strict";
import { SvgAttributes } from "../../../../../../tests/helpers/SvgAttributes";

/**
 * Asserts partition orientation changes cuts while equal-gap separation
 * leaves nonoverlapping pieces.
 */
export function assertPartitionOrientationChangesCutsOther({
  other,
  piece,
}: Readonly<{
  other: ReturnType<typeof _pieces>[number];
  piece: ReturnType<typeof _pieces>[number];
}>): void {
  const { getNumberFromMarkup } = SvgAttributes;
  return assert.ok(
    getNumberFromMarkup({ attributes: piece, name: "x" }) +
      getNumberFromMarkup({ attributes: piece, name: "width" }) <=
      getNumberFromMarkup({ attributes: other, name: "x" }) ||
      getNumberFromMarkup({ attributes: other, name: "x" }) +
        getNumberFromMarkup({ attributes: other, name: "width" }) <=
        getNumberFromMarkup({ attributes: piece, name: "x" }) ||
      getNumberFromMarkup({ attributes: piece, name: "y" }) +
        getNumberFromMarkup({ attributes: piece, name: "height" }) <=
        getNumberFromMarkup({ attributes: other, name: "y" }) ||
      getNumberFromMarkup({ attributes: other, name: "y" }) +
        getNumberFromMarkup({ attributes: other, name: "height" }) <=
        getNumberFromMarkup({ attributes: piece, name: "y" }),
  );
}
