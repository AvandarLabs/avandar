import type { DataAgentHost } from "@/lib/agent/dataAgent/DataAgentHost";
import type { SqlPlaceholderVault } from "@/lib/agent/dataAgent/pagePrivacy/SqlPlaceholderVault";

/**
 * Wraps a data agent host so SQL the model writes with page placeholders
 * (`'<value 1>'`) runs with the values the vault holds. `showQuery` and
 * `readColumnValues` restore before running, so the explorer, the chat
 * result card, and DuckDB all get the real SQL. What the model reads back is
 * unchanged: a query reports only its shape, and a lookup that ran with
 * placeholders returns each held value as its placeholder, so it never
 * tells the model what a placeholder stands for.
 *
 * Use it for any host whose model is hosted, for example the browser's
 * conversation host or an eval host that mirrors it.
 */
export function createPlaceholderRestoringHost(
  host: DataAgentHost,
  vault: SqlPlaceholderVault,
): DataAgentHost {
  return {
    ...host,
    showQuery: (request) => {
      return host.showQuery({ ...request, sql: vault.restore(request.sql) });
    },
    readColumnValues: async (sql) => {
      const restoredSql = vault.restore(sql);
      const values = await host.readColumnValues(restoredSql);
      if (restoredSql === sql || !Array.isArray(values)) {
        return values;
      }
      return values.map((value) => {
        return vault.getPlaceholder(value) ?? value;
      });
    },
  };
}
