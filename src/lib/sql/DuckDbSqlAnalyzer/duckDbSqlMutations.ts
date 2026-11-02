import { prop } from "@avandar/utils";
import { getCopyDirection } from "@/lib/sql/DuckDbSqlAnalyzer/duckDbSqlCopyStatements";
import { getTopLevelMutationIndexes } from "@/lib/sql/DuckDbSqlAnalyzer/duckDbSqlStatements";
import {
  getKeywordIndex,
  getParenthesisDepths,
  getStatementEndIndex,
  isKeywordToken,
} from "@/lib/sql/DuckDbSqlAnalyzer/duckDbSqlTokens";
import type {
  MutationTargetAnalysis,
  SqlToken,
} from "@/lib/sql/DuckDbSqlAnalyzer/DuckDbSqlAnalyzer.types";

type RelationIndexAfterKeywordOptions = {
  endIndex: number;
  keyword: string;
  startIndex: number;
  tokens: readonly SqlToken[];
};

type NonCopyMutationTargetOptions = {
  endIndex: number;
  mutationIndex: number;
  mutationKeyword: string;
  tokens: readonly SqlToken[];
};

type BuildMutationTargetOptions = NonCopyMutationTargetOptions & {
  relationIndex: number | undefined;
};

/** Returns the `USING` keyword indexes of top-level DELETE and MERGE. */
export function getDmlUsingKeywordIndexes(
  tokens: readonly SqlToken[],
): number[] {
  return getTopLevelMutationIndexes(tokens).flatMap((mutationIndex) => {
    if (
      !isKeywordToken({
        token: tokens[mutationIndex],
        keywords: new Set(["DELETE", "MERGE"]),
      })
    ) {
      return [];
    }
    const usingIndex = getKeywordIndex({
      tokens,
      startIndex: mutationIndex + 1,
      endIndex: getStatementEndIndex({
        tokens,
        statementIndex: mutationIndex,
      }),
      keyword: "USING",
      depth: 0,
    });
    return usingIndex === undefined ? [] : [usingIndex];
  });
}

function _getRelationIndexAfterKeyword(
  options: Readonly<RelationIndexAfterKeywordOptions>,
): number | undefined {
  const keywordIndex = getKeywordIndex({ ...options, depth: 0 });
  if (keywordIndex === undefined) {
    return undefined;
  }
  const modifiers = new Set(["EXISTS", "IF", "NOT", "OR", "REPLACE"]);
  const modifierOffset = options.tokens
    .slice(keywordIndex + 1, options.endIndex)
    .findIndex((token) => {
      return !isKeywordToken({ token, keywords: modifiers });
    });
  const relationIndex =
    modifierOffset === -1
      ? options.endIndex
      : keywordIndex + modifierOffset + 1;
  return options.tokens[relationIndex]?.kind === "identifier"
    ? relationIndex
    : undefined;
}

function _hasUnsupportedTargetComma(
  options: Readonly<{
    endIndex: number;
    relationIndex: number;
    tokens: readonly SqlToken[];
  }>,
): boolean {
  const depths = getParenthesisDepths(options.tokens);
  return options.tokens
    .slice(options.relationIndex + 1, options.endIndex)
    .some((token, relativeIndex) => {
      const tokenIndex = options.relationIndex + relativeIndex + 1;
      return token.value === "," && depths[tokenIndex] === 0;
    });
}

function _getAlterRenameDestinationIndex(
  options: Readonly<{
    endIndex: number;
    relationIndex: number;
    tokens: readonly SqlToken[];
  }>,
): number | undefined {
  const renameIndex = getKeywordIndex({
    ...options,
    startIndex: options.relationIndex + 1,
    keyword: "RENAME",
    depth: 0,
  });
  if (
    renameIndex === undefined ||
    !isKeywordToken({ token: options.tokens[renameIndex + 1], keywords: "TO" })
  ) {
    return undefined;
  }
  return options.tokens[renameIndex + 2]?.kind === "identifier"
    ? renameIndex + 2
    : undefined;
}

function _getNonCopyRelationIndex(
  options: Readonly<NonCopyMutationTargetOptions>,
): number | undefined {
  const { endIndex, mutationIndex, mutationKeyword, tokens } = options;
  if (mutationKeyword === "UPDATE") {
    return mutationIndex + 1;
  }
  if (mutationKeyword === "TRUNCATE") {
    return isKeywordToken({
      token: tokens[mutationIndex + 1],
      keywords: "TABLE",
    })
      ? mutationIndex + 2
      : mutationIndex + 1;
  }
  if (["DELETE", "INSERT", "MERGE"].includes(mutationKeyword)) {
    return _getRelationIndexAfterKeyword({
      tokens,
      startIndex: mutationIndex + 1,
      endIndex,
      keyword: mutationKeyword === "DELETE" ? "FROM" : "INTO",
    });
  }
  if (["ALTER", "CREATE", "DROP"].includes(mutationKeyword)) {
    return (
      _getRelationIndexAfterKeyword({
        tokens,
        startIndex: mutationIndex + 1,
        endIndex,
        keyword: "TABLE",
      }) ??
      _getRelationIndexAfterKeyword({
        tokens,
        startIndex: mutationIndex + 1,
        endIndex,
        keyword: "VIEW",
      })
    );
  }
  return undefined;
}

function _buildMutationTargetAnalysis(
  options: Readonly<BuildMutationTargetOptions>,
): MutationTargetAnalysis {
  const { endIndex, mutationKeyword, relationIndex, tokens } = options;
  if (
    relationIndex === undefined ||
    tokens[relationIndex]?.kind !== "identifier"
  ) {
    return { indexes: [], isComplete: false };
  }
  if (
    ["DROP", "TRUNCATE"].includes(mutationKeyword) &&
    _hasUnsupportedTargetComma({ tokens, relationIndex, endIndex })
  ) {
    return { indexes: [relationIndex], isComplete: false };
  }
  const renameDestinationIndex =
    mutationKeyword === "ALTER"
      ? _getAlterRenameDestinationIndex({ tokens, relationIndex, endIndex })
      : undefined;
  return {
    indexes: [
      relationIndex,
      ...(renameDestinationIndex === undefined ? [] : [renameDestinationIndex]),
    ],
    isComplete: true,
  };
}

function _getNonCopyMutationTargets(
  options: Readonly<NonCopyMutationTargetOptions>,
): MutationTargetAnalysis {
  const relationIndex = _getNonCopyRelationIndex(options);
  return _buildMutationTargetAnalysis({ ...options, relationIndex });
}

function _getCopyMutationTargets(
  options: Readonly<{ tokens: readonly SqlToken[]; mutationIndex: number }>,
): MutationTargetAnalysis {
  const { mutationIndex, tokens } = options;
  const copyDirection = getCopyDirection({ mutationIndex, tokens });
  if (copyDirection === undefined) {
    return { indexes: [], isComplete: false };
  }
  const hasQueryRelation = tokens[mutationIndex + 1]?.value === "(";
  const isComplete =
    copyDirection.relationIndex !== undefined ||
    (copyDirection.direction === "TO" && hasQueryRelation);
  const indexes =
    copyDirection.direction === "FROM" &&
    copyDirection.relationIndex !== undefined
      ? [copyDirection.relationIndex]
      : [];
  return { indexes, isComplete };
}

function _getMutationTargetsForIndex(
  options: Readonly<{ tokens: readonly SqlToken[]; mutationIndex: number }>,
): MutationTargetAnalysis {
  const { mutationIndex, tokens } = options;
  const mutationKeyword = tokens[mutationIndex]?.value.toUpperCase() ?? "";
  if (mutationKeyword === "COPY") {
    return _getCopyMutationTargets(options);
  }
  return _getNonCopyMutationTargets({
    tokens,
    mutationIndex,
    mutationKeyword,
    endIndex: getStatementEndIndex({ tokens, statementIndex: mutationIndex }),
  });
}

/** Returns every top-level mutation target index across all statements. */
export function getMutationTargetAnalysis(
  tokens: readonly SqlToken[],
): MutationTargetAnalysis {
  const targetAnalyses = getTopLevelMutationIndexes(tokens).map(
    (mutationIndex) => {
      return _getMutationTargetsForIndex({ tokens, mutationIndex });
    },
  );
  return {
    indexes: targetAnalyses.flatMap(prop("indexes")),
    isComplete: targetAnalyses.every(prop("isComplete")),
  };
}
