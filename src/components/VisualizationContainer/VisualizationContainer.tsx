import { BuiltInVizContainer } from "@/components/VisualizationContainer/BuiltInVizContainer/BuiltInVizContainer";
import { PluginVizRenderer } from "@/lib/plugins/vizs/PluginVizRenderer/PluginVizRenderer";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import type { AvaVizConfig } from "$/models/vizs/AvaVizConfig/AvaVizConfig.types";
import type { UnknownDataFrame } from "@avandar/utils";

type Props = {
  columns: readonly QueryResult.ColumnWithId[];
  /**
   * Every `QueryResult` column the query returned, including any that could
   * not be given a column ID. The table view lists these, so it shows every
   * column even when `columns` leaves some out. Defaults to `columns`.
   */
  rawColumns?: readonly QueryResult.Column[];

  /**
   * The names of the query result columns that are dates.
   *
   * This is not a great way to handle date columns and we should find a
   * better way to handle this.
   */
  dateColumns: ReadonlySet<string>;
  data: UnknownDataFrame;

  /** The visualization config that drives what is rendered. */
  vizConfig: AvaVizConfig;
};

/**
 * Renders a visualization (chart or table) for a given query result and
 * `AvaVizConfig`. Pure and prop-driven: holds no state of its own and has no
 * coupling to any app-specific store, so it can be reused anywhere a query
 * result needs to be visualized.
 *
 * Built-in configs render through `BuiltInVizContainer`. A plugin config
 * draws through `PluginVizRenderer`.
 */
export function VisualizationContainer({
  columns,
  rawColumns,
  data,
  dateColumns,
  vizConfig,
}: Props): JSX.Element {
  if (vizConfig.vizType === "plugin") {
    return (
      <PluginVizRenderer
        columns={columns}
        rawColumns={rawColumns}
        data={data}
        vizConfig={vizConfig}
      />
    );
  }
  return (
    <BuiltInVizContainer
      columns={columns}
      rawColumns={rawColumns}
      data={data}
      dateColumns={dateColumns}
      vizConfig={vizConfig}
    />
  );
}
