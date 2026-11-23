const AUTOMATIC_MATCH_NOTE =
  "(Matched automatically to the candidate values you gave; the user has not seen or confirmed it. Use it only if it means exactly what the user named, and say in the summary which stored value you used.)";

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

  /**
   * The text the model reads for an automatically matched discovery answer.
   * Without the note, an answer the client matched on its own reads exactly
   * like one the user picked, and a loose candidate (such as "New York" for
   * "New York City") turns into a "match you confirmed".
   */
  toModelContent: (content: string): string => {
    return `${content}\n${AUTOMATIC_MATCH_NOTE}`;
  },
};
