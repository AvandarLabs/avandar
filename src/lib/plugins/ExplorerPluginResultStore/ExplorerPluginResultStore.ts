import type { DataExplorerToolbarContext } from "@avandar/plugin-sdk";

/**
 * The Data Explorer result a plugin tool can read: its columns and every row.
 * Published by `useDataExplorerPluginContext` from the settled result.
 */
export type ExplorerPluginResult = {
  columns: DataExplorerToolbarContext["columns"];
  rows: ReadonlyArray<Readonly<Record<string, unknown>>>;
};

let currentResult: ExplorerPluginResult | undefined;

/**
 * Holds the Data Explorer's settled result outside React, so the chat agent,
 * which cannot see the explorer's state, can read what the explorer shows.
 * `useDataExplorerPluginContext` sets it when a run settles and clears it
 * when the explorer unmounts, and the agent's data tools read it with `get`.
 *
 * Keep this file free of React and the plugin SDK runtime. It only imports
 * a type from the SDK, so it adds nothing to the main bundle.
 */
export const ExplorerPluginResultStore = {
  /** Returns the settled result, or undefined when there is none. */
  get: (): ExplorerPluginResult | undefined => {
    return currentResult;
  },
  /** Replaces the settled result. Undefined means the explorer has none. */
  set: (result: ExplorerPluginResult | undefined): void => {
    currentResult = result;
  },
  /** Drops the settled result. */
  clear: (): void => {
    currentResult = undefined;
  },
};
