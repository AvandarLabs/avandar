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

function _isCteDeclaration(
  options: Readonly<{ tokens: readonly SqlToken[]; aliasIndex: number }>,
): boolean {
  const { aliasIndex, tokens } = options;
  const afterColumnsIndex = _getIndexAfterCteColumns({ tokens, aliasIndex });
  if (afterColumnsIndex === undefined) {
    return false;
  }
  let index = afterColumnsIndex;
  if (!isKeywordToken({ token: tokens[index], keywords: "AS" })) {
    return false;
  }
  index += 1;
  if (isKeywordToken({ token: tokens[index], keywords: "NOT" })) {
    index += 1;
  }
  if (isKeywordToken({ token: tokens[index], keywords: "MATERIALIZED" })) {
    index += 1;
  }
  return tokens[index]?.value === "(";
}

/** Returns every common table expression alias and the range it covers. */
export function getCteAliases(tokens: readonly SqlToken[]): CteAlias[] {
  const depths = getParenthesisDepths(tokens);
  return tokens.flatMap((token, aliasIndex) => {
    if (!_isCteDeclaration({ tokens, aliasIndex })) {
      return [];
    }
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
    return [
      {
        name: token.value.toLowerCase(),
        scopeStart: aliasIndex,
        scopeEnd:
          relativeEndIndex === -1 ?
            tokens.length
          : aliasIndex + relativeEndIndex,
      },
    ];
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
