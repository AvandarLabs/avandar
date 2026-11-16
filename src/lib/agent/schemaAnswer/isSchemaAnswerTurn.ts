/**
 * A question the schema listing already answers: column names and types,
 * and whether two datasets can be stacked. The explorer has nothing to show
 * for it.
 */
const SCHEMA_QUESTION_PATTERNS = [
  /\bappendable\b/i,
  /\b(?:can|could) (?:i |we |these |they )(?:be )?(?:appended|stacked)\b/i,
  /\b(?:append|stack) (?:them|these|those|the two|these two)\b/i,
  /\b(?:same|similar|matching|different) columns?\b/i,
  /\bcolumns?\b.{0,60}\b(?:same|similar|match|differ|shared|in common)\b/i,
  /\b(?:compare|comparing) (?:the |their )?columns?\b/i,
  /\bwhat columns\b/i,
  /\bwhich columns\b/i,
  /\blist (?:the |their |all )?columns\b/i,
];

/**
 * A follow-up that reruns the previous turn, rather than a new question.
 */
const RETRY_PATTERN = /^(?:try again\b|that query failed\b)/i;

/** Whether this text asks about columns or whether datasets can be stacked. */
function _isSchemaQuestion(text: string): boolean {
  return SCHEMA_QUESTION_PATTERNS.some((pattern) => {
    return pattern.test(text);
  });
}

/**
 * Whether this turn asks about the shape of the datasets, which the schema
 * listing already answers, so the explorer should not run a query for it.
 * `userTexts` is every user message in the thread, oldest first. A retry
 * ("Try again", or the query-failed follow-up) stays a schema turn when an
 * earlier message was one.
 */
export function isSchemaAnswerTurn(userTexts: readonly string[]): boolean {
  const texts = userTexts
    .map((text) => {
      return text.trim();
    })
    .filter((text) => {
      return text.length > 0;
    });
  const latest = texts.at(-1) ?? "";
  if (_isSchemaQuestion(latest)) {
    return true;
  }
  if (!RETRY_PATTERN.test(latest)) {
    return false;
  }
  return texts.slice(0, -1).some(_isSchemaQuestion);
}
