import { detectPii } from "@/lib/privacy/piiDetector/piiDetector";

/** Matches user messages that answer an inline clarification card. */
export const CLARIFICATION_ANSWER_MARKER_RE = /^\[Clarification answer:/m;

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
    return (
      msg.role === "user" &&
      CLARIFICATION_ANSWER_MARKER_RE.test(msg.content)
    );
  }).length;
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
    const match = message.content.match(/^\[Clarification answer: (.+)\]$/s);
    if (!match) {
      continue;
    }
    const body = match[1]!.trim();
    if (
      body === "(none of the listed options)" ||
      body === "(user let AI decide)"
    ) {
      continue;
    }
    const customMatch = body.match(/^\(custom answer: (.+)\)$/s);
    if (customMatch) {
      approved.add(normalizeAssumptionValue(customMatch[1]!));
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
 * Stable text hashed into consent acks for assumed SQL filter values.
 */
export function buildGeneratedSqlAssumptionAckText(
  values: readonly string[],
): string {
  return `generated_sql_assumptions:${values.join("\u001f")}`;
}
