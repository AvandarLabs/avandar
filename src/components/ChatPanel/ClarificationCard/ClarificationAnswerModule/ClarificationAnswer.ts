import { useLingui } from "@lingui/react/macro";
import { createModule } from "@modules";
import { match } from "ts-pattern";
import type { ChatClarifyResponseShape } from "$/types/chat.types";

const CLARIFICATION_NONE_OF_ABOVE = "__none_of_above__" as const;
const CLARIFICATION_SOMETHING_ELSE = "__something_else__" as const;

function useClarificationNoneOfAboveLabel(): string {
  const { t } = useLingui();
  return t`None of the above`;
}

function useClarificationSomethingElseLabel(): string {
  const { t } = useLingui();
  return t`Something else…`;
}

/** Answer submitted through the clarification card. */
export type ClarificationSubmitAnswer =
  | { kind: "none_of_above" }
  | { kind: "preset"; value: string | string[] }
  | { kind: "custom"; text: string };

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
export const ClarificationAnswer = createModule("ClarificationAnswer", {
  builder: {
    noneOfAbove: CLARIFICATION_NONE_OF_ABOVE,
    somethingElse: CLARIFICATION_SOMETHING_ELSE,
    useNoneOfAboveLabel: useClarificationNoneOfAboveLabel,
    useSomethingElseLabel: useClarificationSomethingElseLabel,
    formatForThread: _formatForThread,
    needsCrossBoundary: _needsCrossBoundary,
  },
});
