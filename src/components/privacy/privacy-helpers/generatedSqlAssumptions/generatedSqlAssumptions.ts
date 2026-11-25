import {
  CLARIFICATION_NONE_OF_ABOVE_BODY,
  containsClarificationAnswerLine,
  parseClarificationAnswerBody,
  parseCustomAnswerText,
} from "$/utils/chat/clarificationAnswerFormat";
import { detectPii } from "@/components/privacy/privacy-helpers/detectPii/detectPii";

export const MAX_CLARIFICATIONS_PER_QUESTION = 3;

export type ThreadMessage = {
  role: string;
  content: string;
};

export type GeneratedSqlAssumptionReview = {
  assumptionCapReached: boolean;
  needsApproval: boolean;
  /** Distinct filter literals in SQL that still need explicit consent. */
  unapprovedValues: string[];
};

/**
 * Counts clarification answers in the visible thread (same marker the
 * edge function uses to enforce the per-question cap).
 */
export function countClarificationAnswersInThread(
  messages: readonly ThreadMessage[],
): number {
  return messages.filter((msg) => {
    return msg.role === "user" && containsClarificationAnswerLine(msg.content);
  }).length;
}

/** Every turn number a clarification card can carry, in order. */
const CLARIFICATION_TURN_NUMBERS = [1, 2, 3] as const;

/**
 * The turn number of a card shown now: one more than the thread's card
 * answers, at most `MAX_CLARIFICATIONS_PER_QUESTION`, as the edge function
 * counts it.
 */
export function buildClarificationTurnNumber(
  messages: readonly ThreadMessage[],
): 1 | 2 | 3 {
  const answerCount = countClarificationAnswersInThread(messages);
  return (
    CLARIFICATION_TURN_NUMBERS[
      Math.min(answerCount, MAX_CLARIFICATIONS_PER_QUESTION - 1)
    ] ?? MAX_CLARIFICATIONS_PER_QUESTION
  );
}

/**
 * Values the user explicitly supplied via clarification answers. Does not
 * include "(none of the listed options)" or legacy skip markers.
 */
export function collectApprovedClarificationValues(
  messages: readonly ThreadMessage[],
): Set<string> {
  const approved = new Set<string>();
  for (const message of messages) {
    if (message.role !== "user") {
      continue;
    }
    const body = parseClarificationAnswerBody(message.content);
    if (body === undefined) {
      continue;
    }
    if (
      body === CLARIFICATION_NONE_OF_ABOVE_BODY ||
      body === "(user let AI decide)"
    ) {
      continue;
    }
    const customText = parseCustomAnswerText(body);
    if (customText !== undefined) {
      approved.add(normalizeAssumptionValue(customText));
      continue;
    }
    for (const part of body.split(",")) {
      const trimmed = part.trim();
      if (trimmed.length > 0) {
        approved.add(normalizeAssumptionValue(trimmed));
      }
    }
  }
  return approved;
}

/** Case-insensitive key for comparing SQL literals to approved answers. */
export function normalizeAssumptionValue(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Pulls single-quoted string literals from DuckDB SQL. Skips empty strings
 * and very short structural tokens.
 */
export function extractSingleQuotedSqlLiterals(sql: string): string[] {
  const literals: string[] = [];
  let index = 0;
  while (index < sql.length) {
    if (sql[index] !== "'") {
      index += 1;
      continue;
    }
    index += 1;
    let value = "";
    while (index < sql.length) {
      if (sql[index] === "'") {
        if (sql[index + 1] === "'") {
          value += "'";
          index += 2;
          continue;
        }
        index += 1;
        break;
      }
      value += sql[index]!;
      index += 1;
    }
    if (value.length > 0) {
      literals.push(value);
    }
  }
  return literals;
}

/**
 * After the clarification cap, any filter literal in generated SQL that the
 * user did not explicitly provide still needs consent. PII in literals always
 * needs consent regardless of cap.
 */
export function reviewGeneratedSqlAssumptions(args: {
  sql: string;
  messages: readonly ThreadMessage[];
}): GeneratedSqlAssumptionReview {
  const clarificationCount = countClarificationAnswersInThread(args.messages);
  const assumptionCapReached =
    clarificationCount >= MAX_CLARIFICATIONS_PER_QUESTION;
  const approved = collectApprovedClarificationValues(args.messages);
  const seen = new Set<string>();
  const unapprovedValues: string[] = [];

  for (const literal of extractSingleQuotedSqlLiterals(args.sql)) {
    const key = normalizeAssumptionValue(literal);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);

    const pii = detectPii({ values: [literal] });
    const isSensitive = pii.severity !== "clean";
    const isUnapprovedAssumption = assumptionCapReached && !approved.has(key);

    if (isSensitive || isUnapprovedAssumption) {
      unapprovedValues.push(literal);
    }
  }

  return {
    assumptionCapReached,
    needsApproval: unapprovedValues.length > 0,
    unapprovedValues,
  };
}

/**
 * Builds stable text for hashing into consent acknowledgements.
 * Use it, for example, when requesting consent for assumed SQL filter values.
 */
export function buildGeneratedSqlAssumptionAckText(
  values: readonly string[],
): string {
  return `generated_sql_assumptions:${values.join("\u001f")}`;
}
