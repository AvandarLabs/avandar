import { prop } from "@avandar/utils";
import { AvaVizConfigs } from "$/models/vizs/AvaVizConfig/AvaVizConfigs";
import { UiVizConfigRenderer } from "@/components/VisualizationContainer/UiVizConfigRenderer/UiVizConfigRenderer";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import type { AvaVizConfig } from "$/models/vizs/AvaVizConfig/AvaVizConfig";
import type { UnknownDataFrame } from "@avandar/utils";

type Props = {
  columns: readonly QueryResult.ColumnWithId[];
  /**
   * Every `QueryResult` column the query returned, including any that could
   * not be given a column ID. The table view lists these, so it shows every
   * column even when `columns` leaves some out. Defaults to `columns`.
   */
  rawColumns?: readonly QueryResult.Column[];

  /** The names of the query result columns that are dates. */
  dateColumns: ReadonlySet<string>;
  data: UnknownDataFrame;

  /** The built-in chart or table config that drives what is rendered. */
  vizConfig: AvaVizConfig.T;
};

/**
 * Renders a built-in chart or table from an `AvaVizConfig`: it replaces each
 * column ID with that column's current `QueryResult` column name, then draws
 * the result with `UiVizConfigRenderer`.
 */
export function BuiltInVizContainer({
  columns,
  rawColumns = columns,
  data,
  dateColumns,
  vizConfig,
}: Props): JSX.Element {
  const uiVizConfigConversion = AvaVizConfigs.toUiVizConfig({
    config: vizConfig,
    columns: columns,
  });
  return (
    <UiVizConfigRenderer
      uiVizConfig={uiVizConfigConversion.config}
      data={data}
      dateColumns={dateColumns}
      columnNames={rawColumns.map(prop("name"))}
    />
  );
}
