import { DEFAULT_INPUT, fixtures } from "../../PdfGridReconstruction.fixtures";
import { assertCompleteMovingColumnsRemainFrame as _assertCompleteMovingColumnsRemainFrame } from "./assertCompleteMovingColumnsRemainFrame";

/**
 * Asserts complete moving columns remain distinct from all retained source
 * cells and headers.
 */
export function assertCompleteMovingColumnsRemainInput(
  input: Readonly<
    typeof DEFAULT_INPUT | NonNullable<typeof fixtures>[number]["input"]
  >,
): void {
  [106, 106.5, 108, 110, 118, 122, 130, 138.5, 139, 150].forEach((frame) => {
    return _assertCompleteMovingColumnsRemainFrame({ frame, input });
  });
}
