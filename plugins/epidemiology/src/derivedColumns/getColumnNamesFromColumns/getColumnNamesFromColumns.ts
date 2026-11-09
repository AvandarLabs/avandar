import type {
  DataExplorerToolbarContext,
  PluginColumnDataType,
} from "@avandar/plugin-sdk";

/** The column types a numeric column picker offers. */
export const NUMERIC_DATA_TYPES: readonly PluginColumnDataType[] = [
  "bigint",
  "double",
];

/**
 * The column types a date column picker offers: the types a date range
 * window can order by. A time of day has no date, so it is left out.
 */
export const TEMPORAL_DATA_TYPES: readonly PluginColumnDataType[] = [
  "date",
  "timestamp",
];

/**
 * Gets the names of the result columns whose type is one of `dataTypes`, in
 * result order, so a command's form can offer only the columns a field
 * accepts, such as the numeric columns for a case count.
 */
export function getColumnNamesFromColumns(
  options: Readonly<{
    columns: DataExplorerToolbarContext["columns"];
    dataTypes: readonly PluginColumnDataType[];
  }>,
): string[] {
  const { columns, dataTypes } = options;
  return columns
    .filter((column) => {
      return dataTypes.includes(column.dataType);
    })
    .map((column) => {
      return column.name;
    });
}
