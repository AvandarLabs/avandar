import type { SqlToken } from "@/lib/sql/DuckDbSqlAnalyzer/DuckDbSqlAnalyzer.types";

import { isDefined, propEq } from "@avandar/utils";

type KeywordIndexOptions = {
  depth?: number;
  endIndex: number;
  keyword: string;
  startIndex: number;
  tokens: readonly SqlToken[];
};

const SQL_TOKEN_REGEX =
  /(?<comment>--[^\n]*|\/\*[\s\S]*?\*\/)|(?<string>'(?:''|[^'])*')|(?<quoted>"(?:""|[^"])*"|`(?:``|[^`])*`)|(?<uuid>[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})|(?<word>[a-z_][a-z0-9_$]*)|(?<symbol>[(),.;])|(?<other>\S)/gi;

function _getTokenFromMatch(match: RegExpExecArray): SqlToken | undefined {
  const groups = match.groups;
  if (groups?.comment !== undefined) {
    return undefined;
  }
  if (groups?.string !== undefined) {
    return {
      kind: "string",
      value: groups.string.slice(1, -1).replaceAll("''", "'"),
    };
  }
  if (groups?.quoted !== undefined) {
    return {
      kind: "identifier",
      value: groups.quoted
        .slice(1, -1)
        .replaceAll('""', '"')
        .replaceAll("``", "`"),
      isQuoted: true,
    };
  }
  const identifier = groups?.uuid ?? groups?.word;
  if (identifier !== undefined) {
    return { kind: "identifier", value: identifier };
  }
  if (groups?.symbol !== undefined) {
    return { kind: "symbol", value: groups.symbol };
  }
  return { kind: "other", value: groups?.other ?? "" };
}

/** Splits SQL into tokens, dropping comments. */
export function getSqlTokens(sql: string): SqlToken[] {
  return Array.from(sql.matchAll(SQL_TOKEN_REGEX))
    .map(_getTokenFromMatch)
    .filter(isDefined);
}

/** Returns whether an unquoted identifier token is one of `keywords`. */
export function isKeywordToken(
  options: Readonly<{
    token: SqlToken | undefined;
    keywords: string | ReadonlySet<string>;
  }>,
): boolean {
  const { keywords, token } = options;
  if (token?.kind !== "identifier" || token.isQuoted === true) {
    return false;
  }
  const keywordSet =
    typeof keywords === "string" ? new Set([keywords]) : keywords;
  return keywordSet.has(token.value.toUpperCase());
}

/** Returns the parenthesis nesting depth in effect at each token. */
export function getParenthesisDepths(tokens: readonly SqlToken[]): number[] {
  let depth = 0;
  return tokens.map((token) => {
    if (token.value === ")") {
      depth -= 1;
    }
    const tokenDepth = depth;
    if (token.value === "(") {
      depth += 1;
    }
    return tokenDepth;
  });
}

/** Returns the index of the `)` that closes the `(` at `openingIndex`. */
export function getClosingParenthesisIndex(
  options: Readonly<{ tokens: readonly SqlToken[]; openingIndex: number }>,
): number | undefined {
  const { openingIndex, tokens } = options;
  let depth = 0;
  const closingIndex = tokens.findIndex((token, index) => {
    if (index < openingIndex) {
      return false;
    }
    if (token.value === "(") {
      depth += 1;
    } else if (token.value === ")") {
      depth -= 1;
    }
    return depth === 0;
  });
  return closingIndex === -1 ? undefined : closingIndex;
}

/** Returns the index of the `;` ending the statement, or the token count. */
export function getStatementEndIndex(
  options: Readonly<{ tokens: readonly SqlToken[]; statementIndex: number }>,
): number {
  const { statementIndex, tokens } = options;
  const relativeEndIndex = tokens.slice(statementIndex).findIndex((token) => {
    return token.value === ";";
  });
  return relativeEndIndex === -1
    ? tokens.length
    : statementIndex + relativeEndIndex;
}

/** Returns the index of `keyword` within a token range, at `depth` if given. */
export function getKeywordIndex(
  options: Readonly<KeywordIndexOptions>,
): number | undefined {
  const { depth, endIndex, keyword, startIndex, tokens } = options;
  const depths = depth === undefined ? undefined : getParenthesisDepths(tokens);
  const relativeIndex = tokens
    .slice(startIndex, endIndex)
    .findIndex((token, relativeTokenIndex) => {
      const tokenIndex = startIndex + relativeTokenIndex;
      return (
        (depth === undefined || depths?.[tokenIndex] === depth) &&
        isKeywordToken({ token, keywords: keyword })
      );
    });
  return relativeIndex === -1 ? undefined : startIndex + relativeIndex;
}

/** Returns whether the token stream has unbalanced parentheses. */
export function hasInvalidTokenStructure(tokens: readonly SqlToken[]): boolean {
  const depths = getParenthesisDepths(tokens);
  return (
    depths.some((depth) => {
      return depth < 0;
    }) ||
    tokens.filter(propEq("value", "(")).length !==
      tokens.filter(propEq("value", ")")).length
  );
}
