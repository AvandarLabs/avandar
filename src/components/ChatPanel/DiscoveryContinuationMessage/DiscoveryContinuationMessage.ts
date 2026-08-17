/** Identifies model-facing discovery messages hidden from the transcript. */
export const DiscoveryContinuationMessage = {
  /** Metadata that marks a message as an internal discovery continuation. */
  metadata: {
    custom: {
      isDiscoveryContinuation: true,
    },
  } as const,

  /** Returns whether metadata marks an internal discovery continuation. */
  isInternal: (
    messageMetadata: Readonly<{ custom?: Record<string, unknown> }> | undefined,
  ): boolean => {
    return messageMetadata?.custom?.isDiscoveryContinuation === true;
  },
};
