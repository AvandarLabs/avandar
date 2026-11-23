import { WorkDecompositionTestState } from "./WorkDecompositionTestState";

const { pieces: _pieces } = WorkDecompositionTestState;
import { assertPartitionOrientationChangesCutsOther as _assertPartitionOrientationChangesCutsOther } from "./assertPartitionOrientationChangesCutsOther";

/**
 * Asserts partition orientation changes cuts while equal-gap separation
 * leaves nonoverlapping pieces.
 */
export function assertPartitionOrientationChangesCutsPiece({
  piece,
  index,
  pieces,
}: Readonly<{
  piece: ReturnType<typeof _pieces>[number];
  index: number;
  pieces: ReturnType<typeof _pieces>;
}>): void {
  return pieces.slice(index + 1).forEach((other) => {
    return _assertPartitionOrientationChangesCutsOther({ other, piece });
  });
}
