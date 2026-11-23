import { DEFAULT_INPUT } from "../../ResumableByteTransfer.fixtures";
import { assertFullRetryCaptionIdentifiesFrame as _assertFullRetryCaptionIdentifiesFrame } from "./assertFullRetryCaptionIdentifiesFrame";
import { type AssertFullRetryCaptionIdentifiesLabelsOptions } from "./ResumableByteTransferTestState";

/**
 * Asserts the full retry caption identifies every exact checkpoint with
 * offsets shown or hidden.
 */
export function assertFullRetryCaptionIdentifiesLabels({
  labels,
  file,
  acknowledgedBytes,
  showOffsets,
}: Readonly<AssertFullRetryCaptionIdentifiesLabelsOptions>): void {
  const input = {
    ...DEFAULT_INPUT,
    labels,
    file: { ...DEFAULT_INPUT.file, ...file },
    acknowledgedBytes,
    showOffsets,
  };
  [56, 66, 80, 100, 139, 150].forEach((frame) => {
    return _assertFullRetryCaptionIdentifiesFrame({
      frame,
      input,
      acknowledgedBytes,
      file,
    });
  });
}
