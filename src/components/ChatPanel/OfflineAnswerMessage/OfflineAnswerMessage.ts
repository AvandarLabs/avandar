import type { ChatModelRunResult } from "@assistant-ui/react";

/**
 * The text a hosted model reads in place of an offline answer. Model-facing
 * English, never translated.
 */
const HOSTED_CONTENT = "[An answer from the offline model, not shown]";

/**
 * Marks the assistant messages an offline turn produces. An offline model
 * reads real gadget names on the device, so its answer may quote one; a
 * hosted request (today's chat, or the agent's recap after a reload) reads
 * a fixed line in its place. The mark lives in the message's
 * `metadata.custom`, which the stored thread keeps.
 */
export const OfflineAnswerMessage = {
  /** What a hosted model reads instead of an offline answer. */
  hostedContent: HOSTED_CONTENT,

  /** The run result with its message marked as an offline answer. */
  mark: (result: ChatModelRunResult): ChatModelRunResult => {
    return {
      ...result,
      metadata: {
        ...result.metadata,
        custom: { ...result.metadata?.custom, isOfflineAnswer: true },
      },
    };
  },

  /** Whether a message's metadata marks it as an offline answer. */
  isOfflineAnswer: (
    messageMetadata: Readonly<{ custom?: Record<string, unknown> }> | undefined,
  ): boolean => {
    return messageMetadata?.custom?.isOfflineAnswer === true;
  },
};
