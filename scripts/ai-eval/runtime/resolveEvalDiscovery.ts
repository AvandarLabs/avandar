import { buildCandidateLookupSqlFromDiscovery } from "@/components/ChatPanel/PendingClarificationBlock/buildCandidateLookupSqlFromDiscovery/buildCandidateLookupSqlFromDiscovery";
import { runEvalSql } from "./runEvalSql";
import type { EvalDatabase } from "./EvalDatabase";

const MAX_DISCOVERY_VALUES = 100;

async function _firstColumnValues(
  database: EvalDatabase,
  sql: string,
): Promise<string[] | { error: string }> {
  const outcome = await runEvalSql(database, sql);
  if (outcome.kind === "failed") {
    return { error: outcome.error };
  }
  return outcome.result.rows
    .map((row) => {
      return row[0];
    })
    .filter((value) => {
      return value !== null && value !== undefined;
    })
    .map(String);
}

/**
 * Lists a lookup's values the way the app's discovery resolver does: values
 * matching the prompt-derived candidates first, wherever they sort, then up
 * to 100 values from the discovery query itself. Runs locally; nothing here
 * reaches the model.
 */
export async function resolveEvalDiscovery(
  database: EvalDatabase,
  options: Readonly<{
    query: string;
    column: string;
    candidateValues: readonly string[];
  }>,
): Promise<{ values: string[] } | { error: string }> {
  const listed = await _firstColumnValues(database, options.query);
  if (!Array.isArray(listed)) {
    return listed;
  }
  const lookupSql = buildCandidateLookupSqlFromDiscovery({
    discoveryQuery: options.query,
    column: options.column,
    candidateValues: options.candidateValues,
  });
  const matched = lookupSql
    ? await _firstColumnValues(database, lookupSql)
    : [];
  const matches = Array.isArray(matched) ? matched : [];
  const others = [...new Set(listed)]
    .filter((value) => {
      return !matches.includes(value);
    })
    .slice(0, MAX_DISCOVERY_VALUES);
  return { values: [...new Set(matches), ...others] };
}
