import { match } from "ts-pattern";

/** Answer submitted through the clarification card. */
export type ClarificationSubmitAnswer =
  | { kind: "none_of_above" }
  | { kind: "preset"; value: string | string[] }
  | { kind: "custom"; text: string };

const ANSWER_PREFIX = "[Clarification answer: ";
const ANSWER_SUFFIX = "]";

/** Body of an answer that rejects every offered option. */
export const CLARIFICATION_NONE_OF_ABOVE_BODY = "(none of the listed options)";

/** Matches a body that wraps a user-typed custom answer. */
const CUSTOM_BODY_RE = /^\(custom answer: (.+)\)$/s;

/**
 * Single source of truth for how a clarification answer is rendered into the
 * chat thread. Every producer and consumer of the line should go through
 * these helpers so the format can change in one place.
 */
export function buildClarificationAnswerLine(body: string): string {
  return `${ANSWER_PREFIX}${body}${ANSWER_SUFFIX}`;
}

/** Renders a submitted clarification answer as a chat thread line. */
export function clarificationAnswerToLine(
  answer: Readonly<ClarificationSubmitAnswer>,
): string {
  return buildClarificationAnswerLine(
    match(answer)
      .with({ kind: "none_of_above" }, () => {
        return CLARIFICATION_NONE_OF_ABOVE_BODY;
      })
      .with({ kind: "custom" }, ({ text }) => {
        return `(custom answer: ${text.trim()})`;
      })
      .with({ kind: "preset" }, ({ value }) => {
        return Array.isArray(value) ? value.join(", ") : value;
      })
      .exhaustive(),
  );
}

/** Whether a message line is a rendered clarification answer. */
export function isClarificationAnswerLine(content: string): boolean {
  return content.startsWith(ANSWER_PREFIX);
}

/** Whether any line in the content is a rendered clarification answer. */
export function containsClarificationAnswerLine(content: string): boolean {
  return content.split("\n").some(isClarificationAnswerLine);
}

/** Extracts the body of a clarification answer line, if it is one. */
export function parseClarificationAnswerBody(
  content: string,
): string | undefined {
  if (
    !isClarificationAnswerLine(content) ||
    !content.endsWith(ANSWER_SUFFIX) ||
    content.length < ANSWER_PREFIX.length + ANSWER_SUFFIX.length + 1
  ) {
    return undefined;
  }
  return content.slice(ANSWER_PREFIX.length, -ANSWER_SUFFIX.length).trim();
}

/** Extracts the text from a custom answer body, if it is one. */
export function parseCustomAnswerText(body: string): string | undefined {
  return body.match(CUSTOM_BODY_RE)?.[1];
}
