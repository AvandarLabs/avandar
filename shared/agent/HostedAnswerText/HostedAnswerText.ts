/** Where an assistant message keeps the text its hosted model wrote. */
const MODEL_TEXT_KEY = "hostedText";

/** A message's metadata, as the stored chat thread keeps it. */
type AnswerMetadata = Readonly<{ custom?: Record<string, unknown> }>;

/**
 * Keeps, beside a hosted agent reply the user reads with real values, the
 * text the model wrote with its placeholders (`<value 1>`). The chat shows
 * the real text. Anything that sends the thread back to a hosted model, such
 * as the recap of a conversation the agent has not seen or the request for
 * a chat title, reads the model's own text instead, so a held value never
 * leaves the device even after a reload has lost the vault that knew it.
 * The text lives in the message's `metadata.custom`, which the stored thread
 * keeps.
 */
export const HostedAnswerText = {
  /**
   * The message metadata that keeps `hostedText`. Add it to a run result
   * only when the text shown differs from what the model wrote.
   */
  toMetadata: (hostedText: string): { custom: { hostedText: string } } => {
    return { custom: { [MODEL_TEXT_KEY]: hostedText } };
  },

  /**
   * The text a hosted model may read for an assistant reply: the text the
   * model wrote when one was kept, else the text shown.
   */
  getModelText: (
    options: Readonly<{ text: string; metadata: AnswerMetadata | undefined }>,
  ): string => {
    const kept = options.metadata?.custom?.[MODEL_TEXT_KEY];
    return typeof kept === "string" ? kept : options.text;
  },
};
