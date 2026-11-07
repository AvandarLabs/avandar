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
  columns: readonly string[];
  limit?: number;
}>;

/** Rows returned by `avandar.data.fetchRows`. */
export type FetchRowsResult = Readonly<{
  rows: ReadonlyArray<Readonly<Record<string, unknown>>>;
  isTruncated: boolean;
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
  content: ReactNode;
}>;

/** A notification a plugin shows. */
export type PluginNotifyOptions = Readonly<{
  title?: string;
  message: string;
  color?: "blue" | "green" | "red" | "yellow";
}>;

/**
 * The API a plugin receives, scoped to one plugin, workspace, user, and
 * invocation. Every call is async or fire-and-forget and passes only
 * serializable data, so plugins run unchanged inside the sandbox later.
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
    openDrawer: (options: PluginOverlayOptions) => void;
    notify: (options: PluginNotifyOptions) => void;
  }>;
  i18n: Readonly<{
    t: (key: string, values?: TranslationValues) => string;
  }>;
}>;

/** Runs when a user invokes a plugin command. */
export type CommandHandler = (avandar: AvandarApi) => Promise<void> | void;

/** What a plugin's entry module exports as its default. */
export type PluginDefinition = Readonly<{
  kind: "avandar-plugin";
  commands: Readonly<Record<string, CommandHandler>>;
}>;
