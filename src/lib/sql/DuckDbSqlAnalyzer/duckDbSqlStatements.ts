import {
  getParenthesisDepths,
  isKeywordToken,
  isSymbolToken,
} from "@/lib/sql/DuckDbSqlAnalyzer/duckDbSqlTokens";
import type { SqlToken } from "@/lib/sql/DuckDbSqlAnalyzer/DuckDbSqlAnalyzer.types";

const MUTATING_KEYWORDS = new Set([
  "ALTER",
  "ATTACH",
  "CALL",
  "COPY",
  "CREATE",
  "DELETE",
  "DETACH",
  "DROP",
  "EXPORT",
  "IMPORT",
  "INSERT",
  "INSTALL",
  "LOAD",
  "MERGE",
  "RESET",
  "SET",
  "TRUNCATE",
  "UPDATE",
  "VACUUM",
]);

/**
 * Statements that change session state or run saved statements. They name no
 * relation, so the analysis cannot prove what they do. Only a statement's first
 * word is checked: `begin` and `commit` are also ordinary column names.
 */
const UNSUPPORTED_STATEMENT_KEYWORDS = new Set([
  "ABORT",
  "BEGIN",
  "CHECKPOINT",
  "COMMIT",
  "DEALLOCATE",
  "END",
  "EXECUTE",
  "FORCE",
  "PRAGMA",
  "PREPARE",
  "ROLLBACK",
  "START",
  "USE",
]);

/** The first word of a statement that only reads. */
const READ_STATEMENT_KEYWORDS = new Set([
  "DESCRIBE",
  "EXPLAIN",
  "FROM",
  "PIVOT",
  "SELECT",
  "SHOW",
  "SUMMARIZE",
  "UNPIVOT",
  "VALUES",
  "WITH",
]);

/** The first word of a statement that is a plain query. */
const PLAIN_QUERY_KEYWORDS = new Set(["FROM", "SELECT", "WITH"]);

/**
 * Returns the index of each statement's first token. A `;` that ends a
 * statement without starting another adds none.
 */
export function getStatementStartIndexes(
  tokens: readonly SqlToken[],
): number[] {
  return [
    0,
    ...tokens.flatMap((token, index) => {
      return isSymbolToken({ token, value: ";" }) ? [index + 1] : [];
    }),
  ].filter((startIndex) => {
    const startToken = tokens[startIndex];
    return (
      startToken !== undefined &&
      !isSymbolToken({ token: startToken, value: ";" })
    );
  });
}

/** Returns whether any statement starts with an unsupported keyword. */
export function hasUnsupportedStatement(tokens: readonly SqlToken[]): boolean {
  return getStatementStartIndexes(tokens).some((startIndex) => {
    return isKeywordToken({
      token: tokens[startIndex],
      keywords: UNSUPPORTED_STATEMENT_KEYWORDS,
    });
  });
}

/** Returns whether every statement starts with a keyword that only reads. */
export function hasOnlyReadStatements(tokens: readonly SqlToken[]): boolean {
  return getStatementStartIndexes(tokens).every((startIndex) => {
    return isKeywordToken({
      token: tokens[startIndex],
      keywords: READ_STATEMENT_KEYWORDS,
    });
  });
}

/**
 * Returns whether the tokens are exactly one `SELECT`, `WITH`, `FROM`, or
 * parenthesized query.
 */
export function isSinglePlainQuery(tokens: readonly SqlToken[]): boolean {
  const startIndexes = getStatementStartIndexes(tokens);
  const startToken =
    startIndexes[0] === undefined ? undefined : tokens[startIndexes[0]];
  return (
    startIndexes.length === 1 &&
    startToken !== undefined &&
    (isSymbolToken({ token: startToken, value: "(" }) ||
      isKeywordToken({ token: startToken, keywords: PLAIN_QUERY_KEYWORDS }))
  );
}

/** Returns whether any top-level statement uses a mutating keyword. */
export function hasMutation(tokens: readonly SqlToken[]): boolean {
  const depths = getParenthesisDepths(tokens);
  return tokens.some((token, index) => {
    return (
      depths[index] === 0 &&
      isKeywordToken({ token, keywords: MUTATING_KEYWORDS })
    );
  });
}

/** Returns each statement's first top-level mutating keyword index. */
export function getTopLevelMutationIndexes(
  tokens: readonly SqlToken[],
): number[] {
  const depths = getParenthesisDepths(tokens);
  const statementStarts = [
    0,
    ...tokens.flatMap((token, index) => {
      return isSymbolToken({ token, value: ";" }) ? [index + 1] : [];
    }),
  ];
  return statementStarts.flatMap((statementStart, statementIndex) => {
    const statementEnd = statementStarts[statementIndex + 1] ?? tokens.length;
    const mutationOffset = tokens
      .slice(statementStart, statementEnd)
      .findIndex((token, relativeIndex) => {
        const index = statementStart + relativeIndex;
        return (
          depths[index] === 0 &&
          isKeywordToken({ token, keywords: MUTATING_KEYWORDS })
        );
      });
    return mutationOffset === -1 ? [] : [statementStart + mutationOffset];
  });
}
