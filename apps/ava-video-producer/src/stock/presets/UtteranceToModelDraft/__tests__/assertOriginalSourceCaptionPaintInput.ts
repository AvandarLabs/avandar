import { assertOriginalSourceCaptionPaintFrame as _assertOriginalSourceCaptionPaintFrame } from "./assertOriginalSourceCaptionPaintFrame";
import type { fixtures } from "../UtteranceToModelDraft.fixtures";

/**
 * Asserts original source and caption paint over copies with full opaque
 * clearance.
 */
export function assertOriginalSourceCaptionPaintInput(
  input: (typeof fixtures)[number]["input"],
): void {
  Array.from(
    { length: Math.max(0, Math.floor((105 - 49) / 1) + 1) },
    (_, sampleIndex) => {
      return 49 + sampleIndex * 1;
    },
  ).forEach((frame) => {
    return _assertOriginalSourceCaptionPaintFrame({ frame, input });
  });
}
