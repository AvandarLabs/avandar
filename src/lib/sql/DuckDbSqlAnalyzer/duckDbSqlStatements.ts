import {
  getParenthesisDepths,
  isKeywordToken,
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
      return token.value === ";" ? [index + 1] : [];
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
