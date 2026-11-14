import { match } from "ts-pattern";
import { clarificationAnswerToLine } from "$/utils/chat/clarificationAnswerFormat";
import type { ChatClarifyResponseShape } from "$/types/chat.types";
import type { ClarificationSubmitAnswer } from "$/utils/chat/clarificationAnswerFormat";

export type { ClarificationSubmitAnswer };

/** Handles a clarification answer and reports whether it was accepted. */
export type ClarificationAnswerHandler = (
  parameters: Readonly<{
    answer: Readonly<ClarificationSubmitAnswer>;
    isInternalDiscovery?: boolean;
  }>,
) => boolean | void | Promise<boolean | void>;

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
  formatForThread: clarificationAnswerToLine,
  needsCrossBoundary: _needsCrossBoundary,
};
