import type { EvalQuestion } from "../EvalQuestion";
import type { EvalQueryResult } from "../runtime/EvalDatabase";

/** Tokens and billed cost across every model call in one question. */
export type EvalUsage = {
  calls: number;
  promptTokens: number;
  cachedPromptTokens: number;
  completionTokens: number;
  reasoningTokens: number;
  cost: number;
};

/** One question the assistant asked, and what the simulated user answered. */
export type EvalClarification = {
  kind: "fixed_options" | "free_text" | "discovery";
  question: string;
  answer: string;
  /** Answered by the client on its own, without showing the user a card. */
  isAutomatic: boolean;
};

/** Everything one question produced, for grading and the report. */
export type EvalAnswer = {
  /** The last SQL the harness ran for the user, after alias rewriting. */
  finalSql?: string;
  /** Chart type, when the answer was shown as a chart. */
  vizType?: string;
  result?: EvalQueryResult;
  /** Why no result: the query failed, or the assistant only replied in text. */
  error?: string;
  assistantText: string;
  clarifications: EvalClarification[];
  /** Consent prompts the user would have seen before data crossed. */
  consentPrompts: number;
  /** Stored data values sent to the model (matched or picked lookups). */
  valuesSentToModel: string[];
  /** Names of the tools the model called, in order. */
  toolNames: readonly string[];
  usage: EvalUsage;
  latencyMs: number;
};

/** One conversation: follow-up questions see the earlier turns. */
export type EvalConversation = {
  ask: (question: EvalQuestion) => Promise<EvalAnswer>;
};

/** A chat harness under test, behind one interface. */
export type EvalHarness = {
  /** Short label for reports, such as `baseline:anthropic/claude-sonnet-5`. */
  label: string;
  startConversation: () => EvalConversation;
  close: () => Promise<void>;
};

/** Usage with no calls, for adding up. */
export const EMPTY_EVAL_USAGE: EvalUsage = {
  calls: 0,
  promptTokens: 0,
  cachedPromptTokens: 0,
  completionTokens: 0,
  reasoningTokens: 0,
  cost: 0,
};

/** Adds two usage totals. */
export function addEvalUsage(left: EvalUsage, right: EvalUsage): EvalUsage {
  return {
    calls: left.calls + right.calls,
    promptTokens: left.promptTokens + right.promptTokens,
    cachedPromptTokens: left.cachedPromptTokens + right.cachedPromptTokens,
    completionTokens: left.completionTokens + right.completionTokens,
    reasoningTokens: left.reasoningTokens + right.reasoningTokens,
    cost: left.cost + right.cost,
  };
}
