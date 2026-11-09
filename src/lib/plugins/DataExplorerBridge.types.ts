/**
 * What the Data Explorer lends one toolbar command invocation so
 * `avandar.dataExplorer.addColumns` can change its query.
 *
 * Built by `useDataExplorerPluginBridge` when a command is clicked, carried
 * by `PluginMenuSlot`, `usePluginCommandRunner`, and `runPluginCommand` to
 * `makePluginApi`, and used by `addColumnsForInvocation`.
 */
export type DataExplorerBridge = Readonly<{
  /**
   * The SQL behind the result the command was invoked on, or undefined when
   * there is none.
   */
  baseSql: string | undefined;

  /**
   * Puts `sql` in the SQL editor, runs it, and offers Undo. Returns false,
   * changing nothing, when the explorer no longer shows the result the
   * command was invoked on.
   */
  applyDerivedColumnsSql: (
    options: Readonly<{ sql: string; columnNames: readonly string[] }>,
  ) => boolean;
}>;
