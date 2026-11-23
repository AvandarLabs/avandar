import { assertFullRetryCaptionIdentifiesShowOffsets as _assertFullRetryCaptionIdentifiesShowOffsets } from "./assertFullRetryCaptionIdentifiesShowOffsets";

/**
 * Asserts the full retry caption identifies every exact checkpoint with
 * offsets shown or hidden.
 */
export function assertFullRetryCaptionIdentifiesAcknowledgedBytes({
  acknowledgedBytes,
  file,
}: Readonly<{
  acknowledgedBytes: number[][number];
  file: Readonly<{ sizeBytes: number; chunkBytes: number }>;
}>): void {
  [false, true].forEach((showOffsets) => {
    return _assertFullRetryCaptionIdentifiesShowOffsets({
      showOffsets,
      file,
      acknowledgedBytes,
    });
  });
}
