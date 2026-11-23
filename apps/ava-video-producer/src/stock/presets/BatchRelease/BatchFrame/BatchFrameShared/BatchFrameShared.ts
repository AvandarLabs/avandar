/** Frames the seal takes to close, ending as the batch completes. */
const SEAL_FRAMES = 2;
/** Seal timing used by EnvelopeSeal within BatchFrame at batch completion. */
export const BatchFrameShared = {
  /** Frames the seal takes to close, ending as the batch completes. */
  SEAL_FRAMES,
} as const;
