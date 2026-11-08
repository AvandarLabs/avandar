/** One message in a request to a model that runs on the user's device. */
export type LocalLlmMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

/** A completion request for a model that runs on the user's device. */
export type LocalLlmRequest = {
  /** The WebLLM model id, such as `Qwen3-4B-q4f16_1-MLC`. */
  modelId: string;
  messages: readonly LocalLlmMessage[];
  maxTokens: number;
  temperature?: number;
  /**
   * A JSON Schema the reply must match. The runtime constrains decoding to
   * it, so a small model cannot return malformed JSON.
   */
  jsonSchema?: object;
};

/** What a local model returned, with its token counts. */
export type LocalLlmCompletion = {
  text: string;
  promptTokens: number;
  completionTokens: number;
};

/**
 * Runs completions on models in the user's browser (WebLLM over WebGPU in
 * the app; the same engine in a headless browser in the eval). Swapping the
 * resident model when `modelId` changes is the implementation's job.
 */
export type LocalLlm = {
  complete: (request: Readonly<LocalLlmRequest>) => Promise<LocalLlmCompletion>;
};
