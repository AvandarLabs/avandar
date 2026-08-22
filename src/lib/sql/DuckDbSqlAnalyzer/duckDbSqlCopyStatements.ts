import {
  getDatasetIdFromRelationAtIndex,
  getIdentifierParts,
} from "@/lib/sql/DuckDbSqlAnalyzer/duckDbSqlIdentifiers";
import { getTopLevelMutationIndexes } from "@/lib/sql/DuckDbSqlAnalyzer/duckDbSqlStatements";
import {
  getKeywordIndex,
  getStatementEndIndex,
  isKeywordToken,
} from "@/lib/sql/DuckDbSqlAnalyzer/duckDbSqlTokens";
import type { SqlToken } from "@/lib/sql/DuckDbSqlAnalyzer/DuckDbSqlAnalyzer.types";

/** Where a COPY statement moves data, and which relation it names. */
export type CopyDirection = {
  direction: "FROM" | "TO";
  keywordIndex: number;
  relationIndex?: number;
};

function _getCopyDirectionKeywordIndex(
  options: Readonly<{
    endIndex: number;
    startIndex: number;
    tokens: readonly SqlToken[];
  }>,
): number | undefined {
  return ["FROM", "TO"]
    .map((keyword) => {
      return getKeywordIndex({
        ...options,
        keyword,
        depth: 0,
      });
    })
    .filter((index): index is number => {
      return index !== undefined;
    })
    .sort((leftIndex, rightIndex) => {
      return leftIndex - rightIndex;
    })[0];
}

/** Returns the direction, keyword index, and relation index of a COPY. */
export function getCopyDirection(
  options: Readonly<{
    mutationIndex: number;
    tokens: readonly SqlToken[];
  }>,
): CopyDirection | undefined {
  const { mutationIndex, tokens } = options;
  const statementEndIndex = getStatementEndIndex({
    tokens,
    statementIndex: mutationIndex,
  });
  const relation = getIdentifierParts({
    tokens,
    startIndex: mutationIndex + 1,
  });
  const relationDatasetId = getDatasetIdFromRelationAtIndex({
    tokens,
    relationIndex: mutationIndex + 1,
  });
  const searchStartIndex = relation?.endIndex ?? mutationIndex + 1;
  const directionIndex = _getCopyDirectionKeywordIndex({
    tokens,
    startIndex: searchStartIndex + 1,
    endIndex: statementEndIndex,
  });
  if (directionIndex === undefined) {
    return undefined;
  }
  return {
    direction: tokens[directionIndex]?.value.toUpperCase() as "FROM" | "TO",
    keywordIndex: directionIndex,
    relationIndex:
      relationDatasetId === undefined ? undefined : mutationIndex + 1,
  };
}

/** Returns the token indexes of every COPY statement's `FROM`/`TO` keyword. */
export function getCopyDirectionKeywordIndexes(
  tokens: readonly SqlToken[],
): Set<number> {
  return new Set(
    getTopLevelMutationIndexes(tokens).flatMap((mutationIndex) => {
      if (!isKeywordToken({ token: tokens[mutationIndex], keywords: "COPY" })) {
        return [];
      }
      const direction = getCopyDirection({ mutationIndex, tokens });
      return direction === undefined ? [] : [direction.keywordIndex];
    }),
  );
}

/** Returns the relation indexes that `COPY ... TO ...` statements read. */
export function getCopyRelationSourceIndexes(
  tokens: readonly SqlToken[],
): number[] {
  return getTopLevelMutationIndexes(tokens).flatMap((mutationIndex) => {
    if (!isKeywordToken({ token: tokens[mutationIndex], keywords: "COPY" })) {
      return [];
    }
    const copyDirection = getCopyDirection({ mutationIndex, tokens });
    return copyDirection?.direction === "TO" &&
      copyDirection.relationIndex !== undefined
      ? [copyDirection.relationIndex]
      : [];
  });
}
