/**
 * What went wrong when a query failed, in terms a person can act on. The raw
 * DuckDB message stays the source of truth for the model, which needs it to
 * repair the SQL. This is what a component translates into copy.
 */
export type QueryErrorKindT =
  | { kind: "missing_column"; columnName: string }
  | { kind: "missing_table" }
  | { kind: "missing_function"; functionName: string }
  | { kind: "mismatched_values" }
  | { kind: "grouping" }
  | { kind: "syntax" }
  | { kind: "blocked" }
  | { kind: "out_of_memory" }
  | { kind: "cancelled" }
  | { kind: "unknown" };

const MISSING_COLUMN_REGEX =
  /Referenced column "([^"]+)" not found|column "([^"]+)" (?:does not exist|not found)/i;
const MISSING_FUNCTION_REGEX = /Function with name (\S+) does not exist/i;
const UUID_REGEX =
  /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/gi;

function _fromMessage(message: string): QueryErrorKindT {
  const columnMatch = message.match(MISSING_COLUMN_REGEX);
  if (columnMatch) {
    return {
      kind: "missing_column",
      columnName: columnMatch[1] ?? columnMatch[2] ?? "",
    };
  }
  const functionMatch = message.match(MISSING_FUNCTION_REGEX);
  if (functionMatch) {
    return { kind: "missing_function", functionName: functionMatch[1]! };
  }
  if (/Table with name .+ does not exist/i.test(message)) {
    return { kind: "missing_table" };
  }
  if (/must appear in the GROUP BY clause/i.test(message)) {
    return { kind: "grouping" };
  }
  if (
    /No function matches the given name and argument types/i.test(message) ||
    /^Conversion Error/i.test(message) ||
    /Could not convert/i.test(message)
  ) {
    return { kind: "mismatched_values" };
  }
  if (/^Parser Error/i.test(message)) {
    return { kind: "syntax" };
  }
  if (
    /^Cannot safely (?:analyze|execute) DuckDB SQL/i.test(message) ||
    /queries must be read-only/i.test(message)
  ) {
    return { kind: "blocked" };
  }
  if (/Out of Memory/i.test(message)) {
    return { kind: "out_of_memory" };
  }
  if (/^INTERRUPT Error|Interrupted|aborted/i.test(message)) {
    return { kind: "cancelled" };
  }
  return { kind: "unknown" };
}

/**
 * The raw message cut to its first paragraph, with DuckDB's caret diagram
 * dropped and dataset ids replaced, for a "Show details" disclosure.
 */
function _toTechnicalDetails(message: string): string {
  const firstParagraph = message.split(/\n\s*\n/)[0] ?? message;
  return firstParagraph.replace(UUID_REGEX, "<dataset>").trim();
}

/**
 * Classifies a failed query's raw error message so the Data Explorer and the
 * chat can explain the failure in plain language, for example "This query
 * uses a column named "deaths" that isn't in the data", while keeping the
 * technical message available on request.
 */
export const QueryErrorKind = {
  fromMessage: _fromMessage,
  toTechnicalDetails: _toTechnicalDetails,
};
