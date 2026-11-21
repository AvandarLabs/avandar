import { assertFullRetryCaptionIdentifiesAcknowledgedBytes as _assertFullRetryCaptionIdentifiesAcknowledgedBytes } from "./assertFullRetryCaptionIdentifiesAcknowledgedBytes";

/**
 * Asserts the full retry caption identifies every exact checkpoint with
 * offsets shown or hidden.
 */
export function assertFullRetryCaptionIdentifiesFile(
  file: Readonly<{ sizeBytes: number; chunkBytes: number }>,
): void {
  Array.from(
    { length: Math.ceil(file.sizeBytes / file.chunkBytes) },
    (_, index) => {
      return index * file.chunkBytes;
    },
  ).forEach((acknowledgedBytes) => {
    return _assertFullRetryCaptionIdentifiesAcknowledgedBytes({
      acknowledgedBytes,
      file,
    });
  });
}
