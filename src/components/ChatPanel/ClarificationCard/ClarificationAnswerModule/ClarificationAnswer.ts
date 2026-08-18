import { match } from "ts-pattern";
import type { ChatClarifyResponseShape } from "$/types/chat.types";

/** Answer submitted through the clarification card. */
export type ClarificationSubmitAnswer =
  | { kind: "none_of_above" }
  | { kind: "preset"; value: string | string[] }
  | { kind: "custom"; text: string };

/** Handles a clarification answer and reports whether it was accepted. */
export type ClarificationAnswerHandler = (
  parameters: Readonly<{
    answer: Readonly<ClarificationSubmitAnswer>;
    isInternalDiscovery?: boolean;
  }>,
) => boolean | void | Promise<boolean | void>;

function _formatForThread(answer: Readonly<ClarificationSubmitAnswer>): string {
  return match(answer)
    .with({ kind: "none_of_above" }, () => {
      return "[Clarification answer: (none of the listed options)]";
    })
    .with({ kind: "custom" }, ({ text }) => {
      return `[Clarification answer: (custom answer: ${text.trim()})]`;
    })
    .with({ kind: "preset" }, ({ value }) => {
      const rendered = Array.isArray(value) ? value.join(", ") : value;
      return `[Clarification answer: ${rendered}]`;
    })
    .exhaustive();
}

function _needsCrossBoundary(
  parameters: Readonly<{
    answer: Readonly<ClarificationSubmitAnswer>;
    responseShape: Readonly<ChatClarifyResponseShape>;
  }>,
): boolean {
  const { answer, responseShape } = parameters;
  return match(answer)
    .with({ kind: "custom" }, () => {
      return true;
    })
    .with({ kind: "preset" }, () => {
      return responseShape.kind === "discovery";
    })
    .with({ kind: "none_of_above" }, () => {
      return false;
    })
    .exhaustive();
}

/** Formats and classifies clarification answers for chat submission. */
export const ClarificationAnswer = {
  /** Sentinel for rejecting every offered clarification option. */
  noneOfAbove: "__none_of_above__" as const,
  /** Sentinel for submitting an answer outside the offered options. */
  somethingElse: "__something_else__" as const,
  formatForThread: _formatForThread,
  needsCrossBoundary: _needsCrossBoundary,
};
