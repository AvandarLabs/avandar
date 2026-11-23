import type { ThinkingLevel } from "@earendil-works/pi-agent-core";

/** An OpenRouter model id and how hard it should think. */
export type PiEvalModelSpec = { id: string; thinkingLevel: ThinkingLevel };

/**
 * Named model policies the eval can run with `--harness pi --config <name>`.
 * A one-model run needs no entry: pass `--config single --model id@thinking`.
 */
export const PI_EVAL_CONFIGS: Record<
  string,
  { primary: PiEvalModelSpec; escalation?: PiEvalModelSpec }
> = {
  /** Haiku answers; Sonnet takes over after a failed or empty query. */
  "haiku-sonnet": {
    primary: { id: "anthropic/claude-haiku-5.5", thinkingLevel: "off" },
    escalation: { id: "anthropic/claude-sonnet-5.5", thinkingLevel: "off" },
  },
  /** GPT-6 Luna answers; Haiku takes over after a failed or empty query. */
  "luna-haiku": {
    primary: { id: "openai/gpt-6-luna", thinkingLevel: "off" },
    escalation: { id: "anthropic/claude-haiku-5.5", thinkingLevel: "off" },
  },
};
