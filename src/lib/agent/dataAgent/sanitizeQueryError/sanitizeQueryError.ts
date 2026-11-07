import { QueryErrorKind } from "@/lib/sql/QueryErrorKind/QueryErrorKind";

const MAX_ERROR_LENGTH = 300;

/**
 * Turns a DuckDB error into text that is safe to send to the model: the kind
 * of error and the identifiers it names (columns, functions), with quoted
 * literals, which can hold row values, replaced by `<value>`. Dataset ids
 * become `<dataset>`.
 */
export function sanitizeQueryError(message: string): string {
  const kind = QueryErrorKind.fromMessage(message);
  const technical = QueryErrorKind.toTechnicalDetails(message)
    .replace(/'(?:[^']|'')*'/g, "'<value>'")
    .slice(0, MAX_ERROR_LENGTH);
  return `${kind.kind}: ${technical}`;
}
