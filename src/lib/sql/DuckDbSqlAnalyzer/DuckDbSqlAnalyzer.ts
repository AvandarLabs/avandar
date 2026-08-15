import { isDefined, prop, propEq, propIsDefined } from "@avandar/utils";

type SqlToken = {
  kind: "identifier" | "other" | "string" | "symbol";
  value: string;
  isQuoted?: boolean;
};

type CteAlias = {
  name: string;
  scopeStart: number;
  scopeEnd: number;
};

type SourceAnalysis = {
  datasetIds: string[];
  unsafeReason?: DuckDbUnsafeSqlReason;
  isMutating: boolean;
  mutatedDatasetIds: string[];
};

type MutationTargetAnalysis = {
  indexes: number[];
  isComplete: boolean;
};

type IdentifierParts = { endIndex: number; parts: string[] };

type IdentifierSourceOptions = {
  aliases: readonly CteAlias[];
  identifier: IdentifierParts;
  recursionDepth: number;
  sourceIndex: number;
  tokens: readonly SqlToken[];
};

type SourceOptions = {
  aliases: readonly CteAlias[];
  recursionDepth: number;
  sourceIndex: number;
  tokens: readonly SqlToken[];
};

type KeywordIndexOptions = {
  depth?: number;
  endIndex: number;
  keyword: string;
  startIndex: number;
  tokens: readonly SqlToken[];
};

type RelationIndexAfterKeywordOptions = Omit<KeywordIndexOptions, "depth">;

type NonCopyMutationTargetOptions = {
  endIndex: number;
  mutationIndex: number;
  mutationKeyword: string;
  tokens: readonly SqlToken[];
};

type BuildMutationTargetOptions = NonCopyMutationTargetOptions & {
  relationIndex: number | undefined;
};

/** Explains why SQL cannot be safely treated as a complete read query. */
export type DuckDbUnsafeSqlReason =
  | "dynamic-query"
  | "invalid-sql"
  | "uninspectable-source";

/** Describes the statically proven dataset effects of DuckDB SQL. */
export type DuckDbSqlAnalysis =
  | { kind: "read"; datasetIds: string[] }
  | {
      kind: "mutating";
      readDatasetIds: string[];
      mutatedDatasetIds: string[];
    }
  | {
      kind: "unsafe";
      reason: DuckDbUnsafeSqlReason;
      datasetIds: string[];
    };

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SQL_TOKEN_REGEX =
  /(?<comment>--[^\n]*|\/\*[\s\S]*?\*\/)|(?<string>'(?:''|[^'])*')|(?<quoted>"(?:""|[^"])*"|`(?:``|[^`])*`)|(?<uuid>[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})|(?<word>[a-z_][a-z0-9_$]*)|(?<symbol>[(),.;])|(?<other>\S)/gi;
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
const INSPECTABLE_TABLE_FUNCTIONS = new Set([
  "generate_series",
  "range",
  "unnest",
]);
const INSPECTABLE_INTERNAL_TABLES = new Set(["reject_errors", "reject_scans"]);
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

function _isKeywordToken(
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

function _getSqlTokens(sql: string): SqlToken[] {
  return Array.from(sql.matchAll(SQL_TOKEN_REGEX))
    .map(_getTokenFromMatch)
    .filter(isDefined);
}

function _getParenthesisDepths(tokens: readonly SqlToken[]): number[] {
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

function _getClosingParenthesisIndex(
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

function _getIndexAfterCteColumns(
  options: Readonly<{ tokens: readonly SqlToken[]; aliasIndex: number }>,
): number | undefined {
  const { aliasIndex, tokens } = options;
  if (tokens[aliasIndex + 1]?.value !== "(") {
    return aliasIndex + 1;
  }
  const closingIndex = _getClosingParenthesisIndex({
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
  if (!_isKeywordToken({ token: tokens[index], keywords: "AS" })) {
    return false;
  }
  index += 1;
  if (_isKeywordToken({ token: tokens[index], keywords: "NOT" })) {
    index += 1;
  }
  if (_isKeywordToken({ token: tokens[index], keywords: "MATERIALIZED" })) {
    index += 1;
  }
  return tokens[index]?.value === "(";
}

function _getCteAliases(tokens: readonly SqlToken[]): CteAlias[] {
  const depths = _getParenthesisDepths(tokens);
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

function _getRemainingIdentifierParts(
  options: Readonly<{
    tokens: readonly SqlToken[];
    endIndex: number;
  }>,
): IdentifierParts {
  const { endIndex, tokens } = options;
  const identifierToken = tokens[endIndex + 2];
  if (
    tokens[endIndex + 1]?.value !== "." ||
    identifierToken?.kind !== "identifier"
  ) {
    return { endIndex, parts: [] };
  }
  const remaining = _getRemainingIdentifierParts({
    tokens,
    endIndex: endIndex + 2,
  });
  return {
    endIndex: remaining.endIndex,
    parts: [identifierToken.value, ...remaining.parts],
  };
}

function _getIdentifierParts(
  options: Readonly<{ tokens: readonly SqlToken[]; startIndex: number }>,
): IdentifierParts | undefined {
  const { startIndex, tokens } = options;
  if (tokens[startIndex]?.kind !== "identifier") {
    return undefined;
  }
  const remaining = _getRemainingIdentifierParts({
    tokens,
    endIndex: startIndex,
  });
  return {
    endIndex: remaining.endIndex,
    parts: [tokens[startIndex].value, ...remaining.parts],
  };
}

function _isSuppressedCteAlias(
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

function _getDatasetIdFromTableName(tableName: string): string | undefined {
  const finalPart = tableName.split(".").at(-1)?.replace(/^"|"$/g, "");
  return finalPart !== undefined && UUID_REGEX.test(finalPart) ?
      finalPart.toLowerCase()
    : undefined;
}

function _mergeDatasetIds(...datasetIdGroups: readonly string[][]): string[] {
  return Array.from(new Set(datasetIdGroups.flat()));
}

function _getFunctionArgumentTokens(
  options: Readonly<{
    tokens: readonly SqlToken[];
    functionNameIndex: number;
  }>,
): SqlToken[] | undefined {
  const { functionNameIndex, tokens } = options;
  const openingIndex = functionNameIndex + 1;
  if (tokens[openingIndex]?.value !== "(") {
    return undefined;
  }
  const closingIndex = _getClosingParenthesisIndex({ tokens, openingIndex });
  return closingIndex === undefined ? undefined : (
      tokens.slice(openingIndex + 1, closingIndex)
    );
}

function _getAnalysisFromQueryFunction(
  options: Readonly<{
    tokens: readonly SqlToken[];
    functionNameIndex: number;
    recursionDepth: number;
  }>,
): SourceAnalysis {
  const { functionNameIndex, recursionDepth, tokens } = options;
  const argumentTokens = _getFunctionArgumentTokens({
    tokens,
    functionNameIndex,
  });
  if (argumentTokens?.length !== 1 || argumentTokens[0]?.kind !== "string") {
    return _unsafeSourceAnalysis("dynamic-query");
  }
  const nestedAnalysis = _getDuckDbSqlAnalysisFromSql({
    sql: argumentTokens[0].value,
    recursionDepth: recursionDepth + 1,
  });
  return _getSourceAnalysisFromDuckDbSqlAnalysis(nestedAnalysis);
}

function _getAnalysisFromTableFunction(
  options: Readonly<{
    tokens: readonly SqlToken[];
    functionNameIndex: number;
    recursionDepth: number;
  }>,
): SourceAnalysis {
  const { functionNameIndex, recursionDepth, tokens } = options;
  const functionName = tokens[functionNameIndex]?.value.toLowerCase() ?? "";
  const argumentTokens = _getFunctionArgumentTokens({
    tokens,
    functionNameIndex,
  });
  if (argumentTokens === undefined) {
    return _unsafeSourceAnalysis("invalid-sql");
  }
  if (functionName === "query") {
    return _getAnalysisFromQueryFunction({
      tokens,
      functionNameIndex,
      recursionDepth,
    });
  }
  if (functionName === "query_table") {
    if (argumentTokens.length !== 1 || argumentTokens[0]?.kind !== "string") {
      return _unsafeSourceAnalysis("dynamic-query");
    }
    const datasetId = _getDatasetIdFromTableName(argumentTokens[0].value);
    return datasetId === undefined ?
        _unsafeSourceAnalysis("uninspectable-source")
      : _readSourceAnalysis([datasetId]);
  }
  return INSPECTABLE_TABLE_FUNCTIONS.has(functionName) ?
      _readSourceAnalysis([])
    : _unsafeSourceAnalysis("uninspectable-source");
}

function _readSourceAnalysis(datasetIds: readonly string[]): SourceAnalysis {
  return {
    datasetIds: [...datasetIds],
    isMutating: false,
    mutatedDatasetIds: [],
  };
}

function _unsafeSourceAnalysis(
  unsafeReason: DuckDbUnsafeSqlReason,
): SourceAnalysis {
  return {
    datasetIds: [],
    unsafeReason,
    isMutating: false,
    mutatedDatasetIds: [],
  };
}

function _getSourceAnalysisFromDuckDbSqlAnalysis(
  analysis: Readonly<DuckDbSqlAnalysis>,
): SourceAnalysis {
  if (analysis.kind === "read") {
    return _readSourceAnalysis(analysis.datasetIds);
  }
  if (analysis.kind === "mutating") {
    return {
      datasetIds: analysis.readDatasetIds,
      isMutating: true,
      mutatedDatasetIds: analysis.mutatedDatasetIds,
    };
  }
  return {
    datasetIds: analysis.datasetIds,
    unsafeReason: analysis.reason,
    isMutating: false,
    mutatedDatasetIds: [],
  };
}

function _getAnalysisFromIdentifierSource(
  options: Readonly<IdentifierSourceOptions>,
): SourceAnalysis {
  const { aliases, identifier, recursionDepth, sourceIndex, tokens } = options;
  if (tokens[identifier.endIndex + 1]?.value === "(") {
    return _getAnalysisFromTableFunction({
      tokens,
      functionNameIndex: identifier.endIndex,
      recursionDepth,
    });
  }
  const datasetId = identifier.parts.at(-1)?.toLowerCase();
  if (
    _isSuppressedCteAlias({
      aliases,
      index: sourceIndex,
      parts: identifier.parts,
    })
  ) {
    return _readSourceAnalysis([]);
  }
  if (datasetId !== undefined && UUID_REGEX.test(datasetId)) {
    return _readSourceAnalysis([datasetId]);
  }
  if (
    identifier.parts.length === 1 &&
    datasetId !== undefined &&
    INSPECTABLE_INTERNAL_TABLES.has(datasetId)
  ) {
    return _readSourceAnalysis([]);
  }
  return _unsafeSourceAnalysis("uninspectable-source");
}

function _getAnalysisFromSource(
  options: Readonly<SourceOptions>,
): SourceAnalysis {
  const { aliases, recursionDepth, sourceIndex, tokens } = options;
  const sourceToken = tokens[sourceIndex];
  if (
    sourceToken?.value === "(" ||
    _isKeywordToken({ token: sourceToken, keywords: "VALUES" })
  ) {
    return _readSourceAnalysis([]);
  }
  const identifier = _getIdentifierParts({ tokens, startIndex: sourceIndex });
  if (identifier === undefined) {
    return _unsafeSourceAnalysis("uninspectable-source");
  }
  return _getAnalysisFromIdentifierSource({
    aliases,
    identifier,
    recursionDepth,
    sourceIndex,
    tokens,
  });
}

function _getDatasetIdFromRelationAtIndex(
  options: Readonly<{ tokens: readonly SqlToken[]; relationIndex: number }>,
): string | undefined {
  const { relationIndex, tokens } = options;
  const relationToken = tokens[relationIndex];
  if (relationToken?.kind === "string") {
    return UUID_REGEX.test(relationToken.value) ?
        relationToken.value.toLowerCase()
      : undefined;
  }
  const identifier = _getIdentifierParts({ tokens, startIndex: relationIndex });
  const datasetId = identifier?.parts.at(-1)?.toLowerCase();
  return datasetId !== undefined && UUID_REGEX.test(datasetId) ?
      datasetId
    : undefined;
}

function _getAnalysisFromCopyRelation(
  options: Readonly<{ tokens: readonly SqlToken[]; relationIndex: number }>,
): SourceAnalysis {
  const datasetId = _getDatasetIdFromRelationAtIndex(options);
  return datasetId === undefined ?
      _unsafeSourceAnalysis("uninspectable-source")
    : _readSourceAnalysis([datasetId]);
}

function _getCopyDirectionKeywordIndexes(
  tokens: readonly SqlToken[],
): Set<number> {
  return new Set(
    _getTopLevelMutationIndexes(tokens).flatMap((mutationIndex) => {
      if (
        !_isKeywordToken({ token: tokens[mutationIndex], keywords: "COPY" })
      ) {
        return [];
      }
      const direction = _getCopyDirection({ mutationIndex, tokens });
      return direction === undefined ? [] : [direction.keywordIndex];
    }),
  );
}

function _getDirectSourceIndexes(tokens: readonly SqlToken[]): number[] {
  const sourceKeywords = new Set([
    "DESCRIBE",
    "FROM",
    "JOIN",
    "PIVOT",
    "SUMMARIZE",
    "UNPIVOT",
  ]);
  const copyDirectionKeywordIndexes = _getCopyDirectionKeywordIndexes(tokens);
  const directIndexes = tokens.flatMap((token, index) => {
    if (
      !_isKeywordToken({ token, keywords: sourceKeywords }) ||
      copyDirectionKeywordIndexes.has(index)
    ) {
      return [];
    }
    const sourceIndex = index + 1;
    if (
      _isKeywordToken({
        token: tokens[sourceIndex],
        keywords: new Set(["SELECT", "FROM"]),
      })
    ) {
      return [];
    }
    return [sourceIndex];
  });
  return [
    ...directIndexes,
    ..._getDmlUsingKeywordIndexes(tokens).map((index) => {
      return index + 1;
    }),
    ..._getCopyRelationSourceIndexes(tokens),
  ];
}

function _getCommaSourceIndexes(tokens: readonly SqlToken[]): number[] {
  const clauseEndKeywords = new Set([
    "GROUP",
    "HAVING",
    "LIMIT",
    "ON",
    "ORDER",
    "QUALIFY",
    "UNION",
    "WHEN",
    "WHERE",
    "WINDOW",
  ]);
  const activeFromDepths = new Set<number>();
  const depths = _getParenthesisDepths(tokens);
  const sourceClauseIndexes = new Set([
    ...tokens.flatMap((token, index) => {
      return _isKeywordToken({ token, keywords: "FROM" }) ? [index] : [];
    }),
    ..._getDmlUsingKeywordIndexes(tokens),
  ]);
  return tokens.flatMap((token, index) => {
    const depth = depths[index] ?? 0;
    if (sourceClauseIndexes.has(index)) {
      activeFromDepths.add(depth);
      return [];
    }
    if (_isKeywordToken({ token, keywords: clauseEndKeywords })) {
      activeFromDepths.delete(depth);
      return [];
    }
    if (token.value === ")") {
      activeFromDepths.delete(depth + 1);
      return [];
    }
    return token.value === "," && activeFromDepths.has(depth) ?
        [index + 1]
      : [];
  });
}

function _getStatementEndIndex(
  options: Readonly<{ tokens: readonly SqlToken[]; statementIndex: number }>,
): number {
  const { statementIndex, tokens } = options;
  const relativeEndIndex = tokens.slice(statementIndex).findIndex((token) => {
    return token.value === ";";
  });
  return relativeEndIndex === -1 ?
      tokens.length
    : statementIndex + relativeEndIndex;
}

function _getKeywordIndex(
  options: Readonly<KeywordIndexOptions>,
): number | undefined {
  const { depth, endIndex, keyword, startIndex, tokens } = options;
  const depths =
    depth === undefined ? undefined : _getParenthesisDepths(tokens);
  const relativeIndex = tokens
    .slice(startIndex, endIndex)
    .findIndex((token, relativeTokenIndex) => {
      const tokenIndex = startIndex + relativeTokenIndex;
      return (
        (depth === undefined || depths?.[tokenIndex] === depth) &&
        _isKeywordToken({ token, keywords: keyword })
      );
    });
  return relativeIndex === -1 ? undefined : startIndex + relativeIndex;
}

function _getDmlUsingKeywordIndexes(tokens: readonly SqlToken[]): number[] {
  return _getTopLevelMutationIndexes(tokens).flatMap((mutationIndex) => {
    if (
      !_isKeywordToken({
        token: tokens[mutationIndex],
        keywords: new Set(["DELETE", "MERGE"]),
      })
    ) {
      return [];
    }
    const usingIndex = _getKeywordIndex({
      tokens,
      startIndex: mutationIndex + 1,
      endIndex: _getStatementEndIndex({
        tokens,
        statementIndex: mutationIndex,
      }),
      keyword: "USING",
      depth: 0,
    });
    return usingIndex === undefined ? [] : [usingIndex];
  });
}

function _getCopyDirectionKeywordIndex(
  options: Readonly<{
    endIndex: number;
    startIndex: number;
    tokens: readonly SqlToken[];
  }>,
): number | undefined {
  return ["FROM", "TO"]
    .map((keyword) => {
      return _getKeywordIndex({
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

function _getCopyDirection(
  options: Readonly<{
    mutationIndex: number;
    tokens: readonly SqlToken[];
  }>,
):
  | { direction: "FROM" | "TO"; keywordIndex: number; relationIndex?: number }
  | undefined {
  const { mutationIndex, tokens } = options;
  const statementEndIndex = _getStatementEndIndex({
    tokens,
    statementIndex: mutationIndex,
  });
  const relation = _getIdentifierParts({
    tokens,
    startIndex: mutationIndex + 1,
  });
  const relationDatasetId = _getDatasetIdFromRelationAtIndex({
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

function _getCopyRelationSourceIndexes(tokens: readonly SqlToken[]): number[] {
  return _getTopLevelMutationIndexes(tokens).flatMap((mutationIndex) => {
    if (!_isKeywordToken({ token: tokens[mutationIndex], keywords: "COPY" })) {
      return [];
    }
    const copyDirection = _getCopyDirection({ mutationIndex, tokens });
    return (
        copyDirection?.direction === "TO" &&
          copyDirection.relationIndex !== undefined
      ) ?
        [copyDirection.relationIndex]
      : [];
  });
}

function _getDatasetIdsAtIndexes(
  options: Readonly<{
    tokens: readonly SqlToken[];
    indexes: readonly number[];
  }>,
): string[] {
  const { indexes, tokens } = options;
  return indexes.flatMap((index) => {
    const datasetId = _getDatasetIdFromRelationAtIndex({
      tokens,
      relationIndex: index,
    });
    return datasetId === undefined ? [] : [datasetId];
  });
}

function _hasMutation(tokens: readonly SqlToken[]): boolean {
  const depths = _getParenthesisDepths(tokens);
  return tokens.some((token, index) => {
    return (
      depths[index] === 0 &&
      _isKeywordToken({ token, keywords: MUTATING_KEYWORDS })
    );
  });
}

function _getTopLevelMutationIndexes(tokens: readonly SqlToken[]): number[] {
  const depths = _getParenthesisDepths(tokens);
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
          _isKeywordToken({ token, keywords: MUTATING_KEYWORDS })
        );
      });
    return mutationOffset === -1 ? [] : [statementStart + mutationOffset];
  });
}

function _getRelationIndexAfterKeyword(
  options: Readonly<RelationIndexAfterKeywordOptions>,
): number | undefined {
  const keywordIndex = _getKeywordIndex({ ...options, depth: 0 });
  if (keywordIndex === undefined) {
    return undefined;
  }
  const modifiers = new Set(["EXISTS", "IF", "NOT", "OR", "REPLACE"]);
  const modifierOffset = options.tokens
    .slice(keywordIndex + 1, options.endIndex)
    .findIndex((token) => {
      return !_isKeywordToken({ token, keywords: modifiers });
    });
  const relationIndex =
    modifierOffset === -1 ?
      options.endIndex
    : keywordIndex + modifierOffset + 1;
  return options.tokens[relationIndex]?.kind === "identifier" ?
      relationIndex
    : undefined;
}

function _hasUnsupportedTargetComma(
  options: Readonly<{
    endIndex: number;
    relationIndex: number;
    tokens: readonly SqlToken[];
  }>,
): boolean {
  const depths = _getParenthesisDepths(options.tokens);
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
  const renameIndex = _getKeywordIndex({
    ...options,
    startIndex: options.relationIndex + 1,
    keyword: "RENAME",
    depth: 0,
  });
  if (
    renameIndex === undefined ||
    !_isKeywordToken({ token: options.tokens[renameIndex + 1], keywords: "TO" })
  ) {
    return undefined;
  }
  return options.tokens[renameIndex + 2]?.kind === "identifier" ?
      renameIndex + 2
    : undefined;
}

function _getMutationTargetsForIndex(
  options: Readonly<{ tokens: readonly SqlToken[]; mutationIndex: number }>,
): MutationTargetAnalysis {
  const { mutationIndex, tokens } = options;
  const endIndex = _getStatementEndIndex({
    tokens,
    statementIndex: mutationIndex,
  });
  const mutationKeyword = tokens[mutationIndex]?.value.toUpperCase() ?? "";
  if (mutationKeyword === "COPY") {
    const copyDirection = _getCopyDirection({ mutationIndex, tokens });
    if (copyDirection === undefined) {
      return { indexes: [], isComplete: false };
    }
    const hasQueryRelation = tokens[mutationIndex + 1]?.value === "(";
    const isComplete =
      copyDirection.relationIndex !== undefined ||
      (copyDirection.direction === "TO" && hasQueryRelation);
    const indexes =
      (
        copyDirection.direction === "FROM" &&
        copyDirection.relationIndex !== undefined
      ) ?
        [copyDirection.relationIndex]
      : [];
    return { indexes, isComplete };
  }
  return _getNonCopyMutationTargets({
    tokens,
    mutationIndex,
    mutationKeyword,
    endIndex,
  });
}

function _getNonCopyRelationIndex(
  options: Readonly<NonCopyMutationTargetOptions>,
): number | undefined {
  const { endIndex, mutationIndex, mutationKeyword, tokens } = options;
  if (mutationKeyword === "UPDATE") {
    return mutationIndex + 1;
  }
  if (mutationKeyword === "TRUNCATE") {
    return (
        _isKeywordToken({
          token: tokens[mutationIndex + 1],
          keywords: "TABLE",
        })
      ) ?
        mutationIndex + 2
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

function _getNonCopyMutationTargets(
  options: Readonly<NonCopyMutationTargetOptions>,
): MutationTargetAnalysis {
  const relationIndex = _getNonCopyRelationIndex(options);
  return _buildMutationTargetAnalysis({ ...options, relationIndex });
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
    mutationKeyword === "ALTER" ?
      _getAlterRenameDestinationIndex({ tokens, relationIndex, endIndex })
    : undefined;
  return {
    indexes: [
      relationIndex,
      ...(renameDestinationIndex === undefined ? [] : [renameDestinationIndex]),
    ],
    isComplete: true,
  };
}

function _getMutationTargetAnalysis(
  tokens: readonly SqlToken[],
): MutationTargetAnalysis {
  const targetAnalyses = _getTopLevelMutationIndexes(tokens).map(
    (mutationIndex) => {
      return _getMutationTargetsForIndex({ tokens, mutationIndex });
    },
  );
  return {
    indexes: targetAnalyses.flatMap(prop("indexes")),
    isComplete: targetAnalyses.every(prop("isComplete")),
  };
}

function _hasRecognizedReadStatement(tokens: readonly SqlToken[]): boolean {
  return _isKeywordToken({
    token: tokens[0],
    keywords: READ_STATEMENT_KEYWORDS,
  });
}

function _hasInvalidTokenStructure(tokens: readonly SqlToken[]): boolean {
  const depths = _getParenthesisDepths(tokens);
  return (
    depths.some((depth) => {
      return depth < 0;
    }) ||
    tokens.filter(propEq("value", "(")).length !==
      tokens.filter(propEq("value", ")")).length
  );
}

function _getSourceAnalyses(
  options: Readonly<{
    recursionDepth: number;
    tokens: readonly SqlToken[];
  }>,
): SourceAnalysis[] {
  const { recursionDepth, tokens } = options;
  const aliases = _getCteAliases(tokens);
  const copyRelationSourceIndexes = new Set(
    _getCopyRelationSourceIndexes(tokens),
  );
  const sourceIndexes = Array.from(
    new Set([
      ..._getDirectSourceIndexes(tokens),
      ..._getCommaSourceIndexes(tokens),
    ]),
  ).sort((leftIndex, rightIndex) => {
    return leftIndex - rightIndex;
  });
  return sourceIndexes.map((sourceIndex) => {
    if (copyRelationSourceIndexes.has(sourceIndex)) {
      return _getAnalysisFromCopyRelation({
        tokens,
        relationIndex: sourceIndex,
      });
    }
    return _getAnalysisFromSource({
      aliases,
      recursionDepth,
      sourceIndex,
      tokens,
    });
  });
}

function _getMutationAnalysis(
  options: Readonly<{
    datasetIds: string[];
    sourceAnalyses: readonly SourceAnalysis[];
    tokens: readonly SqlToken[];
  }>,
): DuckDbSqlAnalysis {
  const { datasetIds, sourceAnalyses, tokens } = options;
  const targetAnalysis = _getMutationTargetAnalysis(tokens);
  if (!targetAnalysis.isComplete) {
    return { kind: "unsafe", reason: "uninspectable-source", datasetIds };
  }
  const mutatedDatasetIds = _mergeDatasetIds(
    _getDatasetIdsAtIndexes({ tokens, indexes: targetAnalysis.indexes }),
    ...sourceAnalyses.map(prop("mutatedDatasetIds")),
  );
  return { kind: "mutating", readDatasetIds: datasetIds, mutatedDatasetIds };
}

function _getDuckDbSqlAnalysisFromSql(
  options: Readonly<{ sql: string; recursionDepth: number }>,
): DuckDbSqlAnalysis {
  const { recursionDepth, sql } = options;
  const tokens = _getSqlTokens(sql);
  if (
    recursionDepth > 16 ||
    tokens.length === 0 ||
    _hasInvalidTokenStructure(tokens)
  ) {
    return { kind: "unsafe", reason: "invalid-sql", datasetIds: [] };
  }
  const sourceAnalyses = _getSourceAnalyses({ tokens, recursionDepth });
  const datasetIds = _mergeDatasetIds(
    ...sourceAnalyses.map(prop("datasetIds")),
  );
  const unsafeReason = sourceAnalyses.find(
    propIsDefined("unsafeReason"),
  )?.unsafeReason;
  if (unsafeReason !== undefined) {
    return { kind: "unsafe", reason: unsafeReason, datasetIds };
  }
  const isMutating =
    _hasMutation(tokens) || sourceAnalyses.some(prop("isMutating"));
  if (isMutating) {
    return _getMutationAnalysis({ tokens, sourceAnalyses, datasetIds });
  }
  if (!_hasRecognizedReadStatement(tokens)) {
    return { kind: "unsafe", reason: "invalid-sql", datasetIds };
  }
  return { kind: "read", datasetIds };
}

/** Returns the complete static dataset effect analysis for DuckDB SQL. */
function _getPublicDuckDbSqlAnalysisFromSql(sql: string): DuckDbSqlAnalysis {
  return _getDuckDbSqlAnalysisFromSql({ sql, recursionDepth: 0 });
}

/** Returns UUID table sources, rejecting incomplete or mutating analysis. */
function _getDatasetIdsFromSqlTableReferences(sql: string): string[] {
  const analysis = _getPublicDuckDbSqlAnalysisFromSql(sql);
  if (analysis.kind === "read") {
    return analysis.datasetIds;
  }
  const reason =
    analysis.kind === "mutating" ? "mutating SQL" : analysis.reason;
  throw new Error(`Cannot safely analyze DuckDB SQL: ${reason}`);
}

/** Performs fail-closed static dataset-effect analysis for DuckDB SQL. */
export const DuckDbSqlAnalyzer = {
  /** Returns UUID table sources, rejecting incomplete or mutating analysis. */
  getDatasetIdsFromSqlTableReferences: _getDatasetIdsFromSqlTableReferences,
  /** Returns the complete static dataset effect analysis for DuckDB SQL. */
  getDuckDbSqlAnalysisFromSql: _getPublicDuckDbSqlAnalysisFromSql,
};
