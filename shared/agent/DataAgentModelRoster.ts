/**
 * The models the data agent may use, shared by the browser (which picks one
 * per turn) and the `chat` edge function's agent proxy (which refuses any
 * other). Chosen with the AI harness eval in `scripts/ai-eval`; see
 * `docs/ai-agent/eval.md` for the results behind each choice.
 */

/** How hard a model should think, in Pi's terms. */
export type DataAgentThinkingLevel = "off" | "minimal" | "low" | "medium";

/** One OpenRouter model id with its thinking level. */
export type DataAgentModelSpec = {
  openRouterId: string;
  thinkingLevel: DataAgentThinkingLevel;
};

/** The roles in the data agent's model policy. */
export const DATA_AGENT_MODEL_ROSTER = {
  /** Answers every question first. */
  primary: {
    openRouterId: "anthropic/claude-haiku-5.5",
    thinkingLevel: "off",
  },
  /** Takes over for the rest of an answer after a failed or empty query. */
  escalation: {
    openRouterId: "anthropic/claude-sonnet-5.5",
    thinkingLevel: "off",
  },
} as const satisfies Record<string, DataAgentModelSpec>;

/** OpenRouter ids the agent proxy accepts. Anything else is refused. */
export const DATA_AGENT_PROXY_MODEL_IDS: ReadonlySet<string> = new Set(
  Object.values(DATA_AGENT_MODEL_ROSTER).map((spec) => {
    return spec.openRouterId;
  }),
);

/** The most output tokens the proxy lets one model request produce. */
export const DATA_AGENT_PROXY_MAX_OUTPUT_TOKENS = 4000;
