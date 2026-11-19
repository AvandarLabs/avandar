import { isDeepStrictEqual } from "node:util";
import type { EvalAnswer } from "../harnesses/EvalHarness";

/** One attempt at a Try again question, without its result. */
type Attempt = Omit<EvalAnswer, "result" | "firstAttempt">;

function _normalizeSql(sql: string): string {
  return sql.replaceAll(/\s+/g, " ").trim().toLowerCase();
}

/** The question on the first card the user saw, trimmed. */
function _firstCardQuestion(attempt: Readonly<Attempt>): string | undefined {
  return attempt.clarifications
    .find((clarification) => {
      return !clarification.isAutomatic;
    })
    ?.question.trim();
}

function _isSameQuery(
  first: Readonly<Attempt>,
  second: Readonly<Attempt>,
): boolean {
  return (
    first.finalSql !== undefined &&
    second.finalSql !== undefined &&
    _normalizeSql(first.finalSql) === _normalizeSql(second.finalSql)
  );
}

function _isSameCard(
  first: Readonly<Attempt>,
  second: Readonly<Attempt>,
): boolean {
  const firstCard = _firstCardQuestion(first);
  return firstCard !== undefined && firstCard === _firstCardQuestion(second);
}

function _isSameBlock(
  first: Readonly<Attempt>,
  second: Readonly<Attempt>,
): boolean {
  const firstWrites = first.dashboardWrites ?? [];
  const secondWrites = second.dashboardWrites ?? [];
  return (
    firstWrites.length === 1 &&
    secondWrites.length === 1 &&
    isDeepStrictEqual(firstWrites[0]!.block, secondWrites[0]!.block)
  );
}

/** Showed no query, asked no card, and wrote no block. */
function _isTextOnly(attempt: Readonly<Attempt>): boolean {
  return (
    attempt.finalSql === undefined &&
    _firstCardQuestion(attempt) === undefined &&
    (attempt.dashboardWrites ?? []).length === 0
  );
}

/**
 * Whether a Try again repeated its first attempt: the same query (whitespace
 * collapsed, trimmed, lowercased), the same first card question (trimmed),
 * the same single dashboard block, or, when neither attempt showed a query,
 * a card, or a block, the same reply (trimmed).
 */
export function isRepeatedAttempt(
  first: Readonly<Attempt>,
  second: Readonly<Attempt>,
): boolean {
  if (
    _isSameQuery(first, second) ||
    _isSameCard(first, second) ||
    _isSameBlock(first, second)
  ) {
    return true;
  }
  return (
    _isTextOnly(first) &&
    _isTextOnly(second) &&
    first.assistantText.trim() === second.assistantText.trim()
  );
}
