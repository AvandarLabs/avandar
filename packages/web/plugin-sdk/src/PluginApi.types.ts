import type { PluginVizDefinition } from "@plugin-sdk/PluginViz.types";
import type { ReactNode } from "react";

/**
 * A column type in a query result, matching Avandar's data types. Plugins
 * read it from `DataExplorerToolbarContext.columns` to decide which columns
 * a command can work with.
 */
export type PluginColumnDataType =
  | "boolean"
  | "bigint"
  | "double"
  | "time"
  | "date"
  | "timestamp"
  | "varchar";

/**
 * An opaque reference to a query result. A plugin passes it back to
 * `avandar.data.fetchRows` and never sees the query behind it.
 */
export type QueryHandle = string & { readonly __brand: "QueryHandle" };

/**
 * What a Data Explorer toolbar command was invoked on: the query result open
 * in the explorer when the user picked the command.
 */
export type DataExplorerToolbarContext = Readonly<{
  slotId: "dataExplorer.toolbar";
  queryHandle: QueryHandle;
  columns: ReadonlyArray<
    Readonly<{ name: string; dataType: PluginColumnDataType }>
  >;
  rowCount: number;
}>;

/**
 * What a command was invoked on. One variant per slot, discriminated by
 * `slotId`.
 */
export type PluginInvocationContext = DataExplorerToolbarContext;

/** Options for `avandar.data.fetchRows`. */
export type FetchRowsOptions = Readonly<{
  /** The names of the columns to read. */
  columns: readonly string[];
  /** The most rows to return. Defaults to 50,000 and cannot exceed 200,000. */
  limit?: number;
}>;

/** Rows returned by `avandar.data.fetchRows`. */
export type FetchRowsResult = Readonly<{
  rows: ReadonlyArray<Readonly<Record<string, unknown>>>;
  /**
   * True when the result had more rows than `rows` holds. A plugin can use it
   * to tell the user that the data it worked on was partial.
   */
  isTruncated: boolean;
}>;

/** One computed column for `avandar.dataExplorer.addColumns`. */
export type DerivedColumn = Readonly<{
  /** Lowercase snake case, matching `^[a-z][a-z0-9_]*$`. */
  name: string;
  /**
   * One SQL scalar or window expression. `{placeholder}`s name keys of
   * `inputs`.
   */
  expression: string;
  /** Placeholder to the name of a column in the invoked-on result. */
  inputs: Readonly<Record<string, string>>;
}>;

/** What `avandar.dataExplorer.addColumns` resolves to. */
export type AddColumnsResult = Readonly<{
  /**
   * The names the columns were added under, after `_2`, `_3` clash suffixes,
   * in input order.
   */
  columnNames: readonly string[];
}>;

/** Values interpolated into an ICU message. */
export type TranslationValues = Readonly<Record<string, string | number>>;

/**
 * Locale code to message key to ICU message, from a plugin's
 * `locales/<lang>.json` files.
 */
export type PluginMessages = Readonly<
  Record<string, Readonly<Record<string, string>>>
>;

/** A modal or drawer a plugin opens. */
export type PluginOverlayOptions = Readonly<{
  title: string;
  /**
   * What the overlay shows. Build it from `@avandar/plugin-ui` components.
   * The host renders this React tree inside the modal or drawer.
   */
  content: ReactNode;
}>;

/** A notification a plugin shows. */
export type PluginNotifyOptions = Readonly<{
  /** The notification's heading. Defaults to the plugin's name. */
  title?: string;
  message: string;
  color?: "blue" | "green" | "red" | "yellow";
}>;

/**
 * The API a plugin receives, scoped to one plugin, workspace, user, and
 * invocation.
 *
 * Calls are async or fire-and-forget and pass serializable data. There are
 * two exceptions. `i18n.t` is synchronous and runs on the plugin side. The
 * `content` of `ui.openModal` and `ui.openDrawer` is a React tree, which the
 * host renders.
 */
export type AvandarApi = Readonly<{
  context: PluginInvocationContext;
  workspace: Readonly<{ id: string; slug: string; locale: string }>;
  data: Readonly<{
    fetchRows: (
      queryHandle: QueryHandle,
      options: FetchRowsOptions,
    ) => Promise<FetchRowsResult>;
  }>;
  ui: Readonly<{
    openModal: (options: PluginOverlayOptions) => void;
    /**
     * Closes the modal this invocation opened last. Does nothing when it
     * opened none or that modal is already closed.
     */
    closeModal: () => void;
    openDrawer: (options: PluginOverlayOptions) => void;
    notify: (options: PluginNotifyOptions) => void;
  }>;
  i18n: Readonly<{
    t: (key: string, values?: TranslationValues) => string;
  }>;
  /**
   * Changes the Data Explorer query the command was invoked on. Present only
   * for commands run from the `dataExplorer.toolbar` slot.
   */
  dataExplorer?: Readonly<{
    /**
     * Adds computed columns to the query, reruns it, and offers the user
     * Undo. Rejects with a `PluginError`: `InvalidExpression` for a column
     * the host cannot add, `InvalidHandle` when the user changed the query
     * since invoking the command.
     */
    addColumns: (
      columns: readonly DerivedColumn[],
    ) => Promise<AddColumnsResult>;
  }>;
}>;

/** Runs when a user invokes a plugin command. */
export type CommandHandler = (avandar: AvandarApi) => Promise<void> | void;

/** What a plugin's entry module exports as its default. */
export type PluginDefinition = Readonly<{
  /** The marker the host checks before it runs anything in the module. */
  kind: "avandar-plugin";
  /**
   * The handlers, keyed by the command ids the plugin declares in its
   * `ava.yaml`.
   */
  commands: Readonly<Record<string, CommandHandler>>;
  /**
   * How each chart type draws, keyed by the chart type ids the plugin
   * declares under `contributes.vizTypes` in its `ava.yaml`.
   */
  vizTypes: Readonly<Record<string, PluginVizDefinition>>;
}>;
