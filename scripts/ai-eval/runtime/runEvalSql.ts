import { DuckDbSqlAnalyzer } from "@/lib/sql/DuckDbSqlAnalyzer/DuckDbSqlAnalyzer";
import type { EvalDatabase, EvalQueryResult } from "./EvalDatabase";

/** How a query ended, the way the Data Explorer would report it. */
export type EvalSqlOutcome =
  | { kind: "rows"; result: EvalQueryResult }
  | { kind: "empty"; result: EvalQueryResult }
  | { kind: "failed"; error: string };

function _isAllNull(result: EvalQueryResult): boolean {
  return result.rows.every((row) => {
    return row.every((cell) => {
      return cell === null || cell === undefined;
    });
  });
}

/**
 * Runs SQL the way the app's query session does: the fail-closed analyzer
 * first (it blocks SQL it cannot inspect), then DuckDB. A result whose cells
 * are all empty counts as empty, as in the app.
 */
export async function runEvalSql(
  database: EvalDatabase,
  sql: string,
): Promise<EvalSqlOutcome> {
  try {
    DuckDbSqlAnalyzer.getRelationsFromSqlTableReferences(sql);
  } catch (error) {
    return {
      kind: "failed",
      error: `Blocked by the SQL analyzer: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
  try {
    const result = await database.query(sql);
    return result.rows.length === 0 || _isAllNull(result)
      ? { kind: "empty", result }
      : { kind: "rows", result };
  } catch (error) {
    return {
      kind: "failed",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
