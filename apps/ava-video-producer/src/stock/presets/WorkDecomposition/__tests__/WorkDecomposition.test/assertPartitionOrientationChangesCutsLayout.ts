import { WorkDecompositionTestState } from "./WorkDecompositionTestState";

const { pieces: _pieces } = WorkDecompositionTestState;
import assert from "node:assert/strict";
import { fixtures } from "../../WorkDecomposition.fixtures";
import { type Input } from "../../WorkDecomposition.schema";
import { assertPartitionOrientationChangesCutsPiece as _assertPartitionOrientationChangesCutsPiece } from "./assertPartitionOrientationChangesCutsPiece";

/**
 * Asserts partition orientation changes cuts while equal-gap separation
 * leaves nonoverlapping pieces.
 */
export function assertPartitionOrientationChangesCutsLayout(
  layout: string,
): void {
  const pieces = _pieces({
    frame: 150,
    input: {
      ...fixtures[2].input,
      partitionLayout: layout as Input["partitionLayout"],
    },
  });
  assert.equal(pieces.length, 6);
  pieces.forEach((piece, index) => {
    return _assertPartitionOrientationChangesCutsPiece({
      piece,
      index,
      pieces,
    });
  });
}
