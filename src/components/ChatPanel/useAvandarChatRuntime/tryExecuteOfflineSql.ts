import { DuckDbClient } from "@/clients/DuckDbClient/DuckDbClient";

/**
 * Best-effort SQL validation for the offline fix pass. Runs against the
 * in-browser DuckDB worker when available.
 */
export async function tryExecuteOfflineSql(
  sql: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await DuckDbClient.runRawQuery(sql);
    return { ok: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "SQL execution failed";
    return { ok: false, error: message };
  }
}
