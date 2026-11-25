/** The `usage` block of an OpenRouter chat-completions response. */
export type OpenRouterRawUsage = {
  prompt_tokens?: number;
  completion_tokens?: number;
  cost?: number;
  prompt_tokens_details?: { cached_tokens?: number };
  completion_tokens_details?: { reasoning_tokens?: number };
};

/**
 * Tokens and billed cost of one or more OpenRouter calls. `cost` is in US
 * dollars, as OpenRouter bills it, including any cache discount.
 */
export type OpenRouterUsage = {
  calls: number;
  promptTokens: number;
  cachedPromptTokens: number;
  completionTokens: number;
  reasoningTokens: number;
  cost: number;
};

const EMPTY_USAGE: OpenRouterUsage = {
  calls: 0,
  promptTokens: 0,
  cachedPromptTokens: 0,
  completionTokens: 0,
  reasoningTokens: 0,
  cost: 0,
};

function _fromRaw(rawUsage: OpenRouterRawUsage | undefined): OpenRouterUsage {
  return {
    calls: 1,
    promptTokens: rawUsage?.prompt_tokens ?? 0,
    cachedPromptTokens: rawUsage?.prompt_tokens_details?.cached_tokens ?? 0,
    completionTokens: rawUsage?.completion_tokens ?? 0,
    reasoningTokens: rawUsage?.completion_tokens_details?.reasoning_tokens ?? 0,
    cost: rawUsage?.cost ?? 0,
  };
}

function _add(left: OpenRouterUsage, right: OpenRouterUsage): OpenRouterUsage {
  return {
    calls: left.calls + right.calls,
    promptTokens: left.promptTokens + right.promptTokens,
    cachedPromptTokens: left.cachedPromptTokens + right.cachedPromptTokens,
    completionTokens: left.completionTokens + right.completionTokens,
    reasoningTokens: left.reasoningTokens + right.reasoningTokens,
    cost: left.cost + right.cost,
  };
}

/** Reads and sums the usage OpenRouter reports for each call. */
export const OpenRouterUsage = {
  empty: EMPTY_USAGE,
  fromRaw: _fromRaw,
  add: _add,
};
