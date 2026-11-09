import type {
  DataAgentHost,
  DataAgentQueryOutcome,
} from "@/lib/agent/dataAgent/DataAgentHost";
import type { SqlPlaceholderVault } from "@/lib/agent/dataAgent/pagePrivacy/SqlPlaceholderVault";

/**
 * A query's outcome as the model may read it: held values in column names
 * (DuckDB names an unaliased expression after its SQL, restored values
 * included), preview cells, and errors become their placeholders.
 */
function _maskOutcome(
  outcome: DataAgentQueryOutcome,
  vault: SqlPlaceholderVault,
): DataAgentQueryOutcome {
  if (outcome.kind === "failed") {
    return { ...outcome, error: vault.maskResultText(outcome.error) };
  }
  const columns = outcome.columns.map((column) => {
    return { ...column, name: vault.maskResultText(column.name) };
  });
  const previewRows = outcome.previewRows?.map((row) => {
    return row.map((cell) => {
      return typeof cell === "string" ? vault.maskResultText(cell) : cell;
    });
  });
  return {
    ...outcome,
    columns,
    ...(previewRows === undefined ? {} : { previewRows }),
  };
}

/**
 * Wraps a data agent host so SQL the model writes with page placeholders
 * (`'<value 1>'`) runs with the values the vault holds. `showQuery` and
 * `readColumnValues` restore before running, so the explorer, the chat
 * result card, and DuckDB all get the real SQL. SQL with an unknown
 * placeholder, or one inside a longer string, fails without running, with
 * the reason for the model.
 *
 * Nothing the model reads back carries a restored value: a query's column
 * names, preview cells, and error are masked, and a lookup that ran with
 * placeholders returns each held value as its placeholder.
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
    showQuery: async (request) => {
      const problem = vault.getPlaceholderError(request.sql);
      if (problem !== undefined) {
        return { kind: "failed", error: problem };
      }
      const outcome = await host.showQuery({
        ...request,
        sql: vault.restore(request.sql),
      });
      return _maskOutcome(outcome, vault);
    },
    readColumnValues: async (sql) => {
      const problem = vault.getPlaceholderError(sql);
      if (problem !== undefined) {
        return { error: problem };
      }
      const restoredSql = vault.restore(sql);
      const values = await host.readColumnValues(restoredSql);
      if (!Array.isArray(values)) {
        return { error: vault.maskResultText(values.error) };
      }
      return restoredSql === sql
        ? values
        : values.map((value) => {
            return vault.getPlaceholder(value) ?? value;
          });
    },
    isHeldPlaceholder: vault.isHeldPlaceholder,
  };
}
