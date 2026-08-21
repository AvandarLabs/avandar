import { RelationRef } from "$/models/relations/RelationRef/RelationRef";
import type {
  IdentifierParts,
  SqlToken,
} from "@/lib/sql/DuckDbSqlAnalyzer/DuckDbSqlAnalyzer.types";

/** Matches the dataset IDs that name bare DuckDB tables. */
export const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Returns the relation a DuckDB table name refers to, or undefined when the
 * name refers to none. `RelationRef.fromTableName` decides which prefix means
 * which kind, so that encoding stays in one place; the extra `UUID_REGEX` test
 * re-applies this analyzer's stricter UUID shape, which is what separates an
 * inspectable relation table from an arbitrary workspace alias.
 */
export function getRelationRefFromTableName(
  tableName: string,
): RelationRef.T | undefined {
  const relation = RelationRef.fromTableName(tableName.toLowerCase());
  return relation !== undefined && UUID_REGEX.test(relation.id) ?
      relation
    : undefined;
}

/** Reports whether a DuckDB table name names a relation the analyzer knows. */
export function isRelationTableName(tableName: string): boolean {
  return getRelationRefFromTableName(tableName) !== undefined;
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

/** Reads the dot-separated identifier starting at `startIndex`. */
export function getIdentifierParts(
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

/** Returns the dataset ID a qualified table name resolves to, if any. */
export function getDatasetIdFromTableName(
  tableName: string,
): string | undefined {
  const finalPart = tableName.split(".").at(-1)?.replace(/^"|"$/g, "");
  return finalPart !== undefined && UUID_REGEX.test(finalPart) ?
      finalPart.toLowerCase()
    : undefined;
}

/** Returns the dataset ID named by the relation token at `relationIndex`. */
export function getDatasetIdFromRelationAtIndex(
  options: Readonly<{ tokens: readonly SqlToken[]; relationIndex: number }>,
): string | undefined {
  const { relationIndex, tokens } = options;
  const relationToken = tokens[relationIndex];
  if (relationToken?.kind === "string") {
    return UUID_REGEX.test(relationToken.value) ?
        relationToken.value.toLowerCase()
      : undefined;
  }
  const identifier = getIdentifierParts({ tokens, startIndex: relationIndex });
  const datasetId = identifier?.parts.at(-1)?.toLowerCase();
  return datasetId !== undefined && UUID_REGEX.test(datasetId) ?
      datasetId
    : undefined;
}

/** Returns the dataset IDs named by the relations at each of `indexes`. */
export function getDatasetIdsAtIndexes(
  options: Readonly<{
    tokens: readonly SqlToken[];
    indexes: readonly number[];
  }>,
): string[] {
  const { indexes, tokens } = options;
  return indexes.flatMap((index) => {
    const datasetId = getDatasetIdFromRelationAtIndex({
      tokens,
      relationIndex: index,
    });
    return datasetId === undefined ? [] : [datasetId];
  });
}

/** Flattens name groups into one list, in first-seen order, without dupes. */
export function mergeUniqueNames(...nameGroups: readonly string[][]): string[] {
  return Array.from(new Set(nameGroups.flat()));
}
