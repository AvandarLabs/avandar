import type { RelationRef } from "$/models/relations/RelationRef/RelationRef";

import { DuckDbSqlAnalyzer } from "@/lib/sql/DuckDbSqlAnalyzer/DuckDbSqlAnalyzer";

/**
 * The relations a statement reads, or `unsupported` when they cannot be
 * determined. There is deliberately no third case: a caller that cannot learn
 * what a statement touches must refuse to run it.
 */
export type ExtractReferencedRelationsResult =
  | { outcome: "ok"; relations: readonly RelationRef.T[] }
  | { outcome: "unsupported"; reason: string };

/**
 * Converts DuckDB SQL into the relations it reads. Fails closed: any statement
 * the analyzer cannot fully account for, including any mutating statement, is
 * `unsupported` and carries no relation list at all, because an empty list
 * reads as "this statement touches nothing" and would let an authorization
 * check pass vacuously.
 */
export function extractReferencedRelations(
  sql: string,
): ExtractReferencedRelationsResult {
  try {
    return {
      outcome: "ok",
      relations: DuckDbSqlAnalyzer.getRelationsFromSqlTableReferences(sql),
    };
  } catch (error) {
    return {
      outcome: "unsupported",
      reason: error instanceof Error ? error.message : String(error),
    };
  }
}
