import {
  getClosingParenthesisIndex,
  getParenthesisDepths,
  isKeywordToken,
} from "@/lib/sql/DuckDbSqlAnalyzer/duckDbSqlTokens";
import type {
  CteAlias,
  SqlToken,
} from "@/lib/sql/DuckDbSqlAnalyzer/DuckDbSqlAnalyzer.types";

function _getIndexAfterCteColumns(
  options: Readonly<{ tokens: readonly SqlToken[]; aliasIndex: number }>,
): number | undefined {
  const { aliasIndex, tokens } = options;
  if (tokens[aliasIndex + 1]?.value !== "(") {
    return aliasIndex + 1;
  }
  const closingIndex = getClosingParenthesisIndex({
    tokens,
    openingIndex: aliasIndex + 1,
  });
  return closingIndex === undefined ? undefined : closingIndex + 1;
}

/**
 * Returns the index of the `(` that opens a CTE's body when `aliasIndex` is the
 * start of a declaration (`name [(columns)] AS [NOT] [MATERIALIZED] (`), and
 * undefined when it is not one.
 */
function _getCteBodyOpeningIndex(
  options: Readonly<{ tokens: readonly SqlToken[]; aliasIndex: number }>,
): number | undefined {
  const { aliasIndex, tokens } = options;
  if (tokens[aliasIndex]?.kind !== "identifier") {
    return undefined;
  }
  const afterColumnsIndex = _getIndexAfterCteColumns({ tokens, aliasIndex });
  if (afterColumnsIndex === undefined) {
    return undefined;
  }
  let index = afterColumnsIndex;
  if (!isKeywordToken({ token: tokens[index], keywords: "AS" })) {
    return undefined;
  }
  index += 1;
  if (isKeywordToken({ token: tokens[index], keywords: "NOT" })) {
    index += 1;
  }
  if (isKeywordToken({ token: tokens[index], keywords: "MATERIALIZED" })) {
    index += 1;
  }
  return tokens[index]?.value === "(" ? index : undefined;
}

/**
 * Returns where a CTE's name starts to mean the CTE inside its own body.
 *
 * A plain CTE does not see itself: a read of its own name inside the body is a
 * read of the real table of that name. A recursive CTE sees itself only from
 * the last top-level `UNION` of its body, because the terms before it are the
 * base and read the real table too.
 */
function _getOwnNameScopeStart(
  options: Readonly<{
    tokens: readonly SqlToken[];
    depths: readonly number[];
    isRecursive: boolean;
    bodyOpeningIndex: number;
    bodyClosingIndex: number;
  }>,
): number {
  const { bodyClosingIndex, bodyOpeningIndex, depths, tokens } = options;
  if (!options.isRecursive) {
    return bodyClosingIndex + 1;
  }
  const bodyDepth = (depths[bodyOpeningIndex] ?? 0) + 1;
  const lastUnionIndex = tokens.findLastIndex((token, index) => {
    return (
      index > bodyOpeningIndex &&
      index < bodyClosingIndex &&
      depths[index] === bodyDepth &&
      isKeywordToken({ token, keywords: "UNION" })
    );
  });
  return lastUnionIndex === -1 ? bodyClosingIndex + 1 : lastUnionIndex;
}

/** Returns where a CTE's scope ends: the end of the statement or subquery. */
function _getCteScopeEnd(
  options: Readonly<{
    tokens: readonly SqlToken[];
    depths: readonly number[];
    aliasIndex: number;
  }>,
): number {
  const { aliasIndex, depths, tokens } = options;
  const aliasDepth = depths[aliasIndex] ?? 0;
  const relativeEndIndex = tokens
    .slice(aliasIndex + 1)
    .findIndex((candidate, relativeIndex) => {
      const index = aliasIndex + relativeIndex + 1;
      return (
        (candidate.value === ";" && depths[index] === aliasDepth) ||
        (candidate.value === ")" && (depths[index] ?? 0) < aliasDepth)
      );
    });
  return relativeEndIndex === -1
    ? tokens.length
    : aliasIndex + relativeEndIndex;
}

/**
 * Returns the CTEs declared by the `WITH` at `withIndex`. A name counts only
 * when it follows `WITH [RECURSIVE]` or a comma that continues that list, so a
 * `name AS (` anywhere else, such as a `WINDOW` definition, declares nothing.
 */
function _getAliasesFromWithClause(
  options: Readonly<{
    tokens: readonly SqlToken[];
    depths: readonly number[];
    withIndex: number;
  }>,
): CteAlias[] {
  const { depths, tokens, withIndex } = options;
  const isRecursive = isKeywordToken({
    token: tokens[withIndex + 1],
    keywords: "RECURSIVE",
  });
  const aliases: CteAlias[] = [];
  let aliasIndex = withIndex + (isRecursive ? 2 : 1);
  for (;;) {
    const bodyOpeningIndex = _getCteBodyOpeningIndex({ tokens, aliasIndex });
    const bodyClosingIndex =
      bodyOpeningIndex === undefined
        ? undefined
        : getClosingParenthesisIndex({
            tokens,
            openingIndex: bodyOpeningIndex,
          });
    if (bodyOpeningIndex === undefined || bodyClosingIndex === undefined) {
      return aliases;
    }
    aliases.push({
      name: (tokens[aliasIndex]?.value ?? "").toLowerCase(),
      scopeStart: _getOwnNameScopeStart({
        tokens,
        depths,
        isRecursive,
        bodyOpeningIndex,
        bodyClosingIndex,
      }),
      scopeEnd: _getCteScopeEnd({ tokens, depths, aliasIndex }),
    });
    if (tokens[bodyClosingIndex + 1]?.value !== ",") {
      return aliases;
    }
    aliasIndex = bodyClosingIndex + 2;
  }
}

/** Returns every common table expression alias and the range it covers. */
export function getCteAliases(tokens: readonly SqlToken[]): CteAlias[] {
  const depths = getParenthesisDepths(tokens);
  return tokens.flatMap((token, withIndex) => {
    return isKeywordToken({ token, keywords: "WITH" })
      ? _getAliasesFromWithClause({ tokens, depths, withIndex })
      : [];
  });
}

/** Returns whether a source name resolves to a CTE alias already in scope. */
export function isSuppressedCteAlias(
  options: Readonly<{
    aliases: readonly CteAlias[];
    index: number;
    parts: readonly string[];
  }>,
): boolean {
  if (options.parts.length !== 1) {
    return false;
  }
  const name = options.parts[0]?.toLowerCase();
  return options.aliases.some((alias) => {
    return (
      alias.name === name &&
      options.index >= alias.scopeStart &&
      options.index <= alias.scopeEnd
    );
  });
}
