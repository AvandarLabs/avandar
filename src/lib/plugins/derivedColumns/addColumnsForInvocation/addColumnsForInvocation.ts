import { PluginError } from "@avandar/plugin-sdk";
import { makeDerivedColumnsSqlFromColumns } from "@/lib/plugins/derivedColumns/makeDerivedColumnsSqlFromColumns/makeDerivedColumnsSqlFromColumns";
import type { DataExplorerBridge } from "@/lib/plugins/DataExplorerBridge.types";
import type {
  AddColumnsResult,
  DataExplorerToolbarContext,
  DerivedColumn,
} from "@avandar/plugin-sdk";

/** Why a stale or empty explorer rejects `addColumns`, for the plugin. */
const STALE_RESULT_MESSAGE =
  "This query result is no longer available. Run the command again.";

/**
 * Implements `avandar.dataExplorer.addColumns` for one toolbar invocation:
 * wraps the SQL behind the invoked-on result with `columns`, hands it to the
 * Data Explorer through `bridge`, and returns the names the columns were
 * added under. Called by `makePluginApi`.
 *
 * Throws `PluginError("InvalidExpression")` for a column it cannot add, and
 * `PluginError("InvalidHandle")` when the explorer has no SQL or no longer
 * shows the result the command was invoked on.
 */
export function addColumnsForInvocation(
  options: Readonly<{
    context: DataExplorerToolbarContext;
    bridge: DataExplorerBridge;
    columns: readonly DerivedColumn[];
  }>,
): AddColumnsResult {
  const { context, bridge, columns } = options;
  if (bridge.baseSql === undefined) {
    throw new PluginError("InvalidHandle", STALE_RESULT_MESSAGE);
  }
  const { sql, columnNames } = makeDerivedColumnsSqlFromColumns({
    baseSql: bridge.baseSql,
    existingColumnNames: context.columns.map((column) => {
      return column.name;
    }),
    columns,
  });
  if (!bridge.applyDerivedColumnsSql({ sql, columnNames })) {
    throw new PluginError("InvalidHandle", STALE_RESULT_MESSAGE);
  }
  return { columnNames };
}
