import { useLingui } from "@lingui/react/macro";
import type { ChatClarifyResponseShape } from "$/types/chat.types";

/** Sentinel value for fixed-option UI when the user rejects all listed choices. */
export const CLARIFICATION_NONE_OF_ABOVE = "__none_of_above__" as const;

/** Sentinel value for fixed-option UI when the user will type a custom answer. */
export const CLARIFICATION_SOMETHING_ELSE = "__something_else__" as const;

/**
 * Localized label for the "none of the above" sentinel option in the
 * clarification card.
 */
export function _useClarificationNoneOfAboveLabel(): string {
  const { t } = useLingui();
  return t`None of the above`;
}

/**
 * Localized label for the "something else" sentinel option in the
 * clarification card.
 */
export function _useClarificationSomethingElseLabel(): string {
  const { t } = useLingui();
  return t`Something else…`;
}

export type ClarificationSubmitAnswer =
  | { kind: "none_of_above" }
  | { kind: "preset"; value: string | string[] }
  | { kind: "custom"; text: string };

/**
 * Builds the user message appended after a clarification is answered. The
 * backend counts `[Clarification answer:` markers against the per-question cap.
 */
export function formatClarificationAnswerForThread(
  answer: ClarificationSubmitAnswer,
): string {
  if (answer.kind === "none_of_above") {
    return "[Clarification answer: (none of the listed options)]";
  }
  if (answer.kind === "custom") {
    const trimmed = answer.text.trim();
    return `[Clarification answer: (custom answer: ${trimmed})]`;
  }
  const rendered =
    Array.isArray(answer.value) ? answer.value.join(", ") : answer.value;
  return `[Clarification answer: ${rendered}]`;
}

/**
 * Whether the user's answer should pass through `crossBoundary` before the
 * next LLM turn. Preset picks from LLM-emitted fixed options are safe; typed
 * or discovery-selected values are not.
 */
export function clarificationAnswerNeedsCrossBoundary(
  answer: ClarificationSubmitAnswer,
  responseShape: ChatClarifyResponseShape,
): boolean {
  if (answer.kind === "custom") {
    return true;
  }
  if (answer.kind === "preset" && responseShape.kind === "discovery") {
    return true;
  }
  return false;
}
