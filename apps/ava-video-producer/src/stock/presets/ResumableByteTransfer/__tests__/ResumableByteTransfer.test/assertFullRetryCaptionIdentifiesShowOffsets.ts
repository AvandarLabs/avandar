import { DEFAULT_INPUT, fixtures } from "../../ResumableByteTransfer.fixtures";
import { assertFullRetryCaptionIdentifiesLabels as _assertFullRetryCaptionIdentifiesLabels } from "./assertFullRetryCaptionIdentifiesLabels";

/**
 * Asserts the full retry caption identifies every exact checkpoint with
 * offsets shown or hidden.
 */
export function assertFullRetryCaptionIdentifiesShowOffsets({
  showOffsets,
  file,
  acknowledgedBytes,
}: Readonly<{
  showOffsets: boolean;
  file: Readonly<{ sizeBytes: number; chunkBytes: number }>;
  acknowledgedBytes: number;
}>): void {
  [
    DEFAULT_INPUT.labels,
    fixtures[2].input.labels,
    { ...DEFAULT_INPUT.labels, retry: `界 ${"界".repeat(20)} 界` },
  ].forEach((labels) => {
    return _assertFullRetryCaptionIdentifiesLabels({
      labels,
      file,
      acknowledgedBytes,
      showOffsets,
    });
  });
}
