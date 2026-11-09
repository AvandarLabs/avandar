import { AvaPluginVizConfigSchema } from "$/models/vizs/AvaPluginVizConfig/PluginVizConfigSchemas";
import { PluginVizPlaceholder } from "@/lib/plugins/vizs/PluginVizPlaceholder/PluginVizPlaceholder";
import { PluginVizChartLoader } from "@/lib/plugins/vizs/PluginVizRenderer/PluginVizChartLoader";
import { PluginVizConfiguredChart } from "@/lib/plugins/vizs/PluginVizRenderer/PluginVizConfiguredChart";
import { usePluginVizType } from "@/lib/plugins/vizs/usePluginVizType/usePluginVizType";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import type { AvaVizConfig } from "$/models/vizs/AvaVizConfig/AvaVizConfig";
import type { UnknownDataFrame } from "@avandar/utils";

type Props = {
  columns: readonly QueryResult.ColumnWithId[];

  /**
   * Every column the query returned, including any that could not be given a
   * column ID. The chart's input lists these. Defaults to `columns`.
   */
  rawColumns?: readonly QueryResult.Column[];
  data: UnknownDataFrame;
  vizConfig: AvaVizConfig.Plugin;

  /**
   * Whether `data` holds only the first rows of a longer result. A transform
   * chart then notes how many rows it was built from. Defaults to false,
   * because `VisualizationContainer`'s callers pass the full result their
   * query returned. Only a caller that knows its result was cut short sets
   * it.
   */
  isTruncated?: boolean;
};

/**
 * Draws a stored plugin chart from the plugins this deployment bundles, the
 * `plugin` branch of `VisualizationContainer`. It needs neither the plugin
 * host nor a workspace, so a plugin chart also draws on a public dashboard
 * link. A config that fails validation, a plugin or chart type that is not
 * bundled, unset required settings, code that fails to load, and a chart
 * that fails to render each show their own state in the chart area.
 */
export function PluginVizRenderer({
  columns,
  rawColumns = columns,
  data,
  vizConfig,
  isTruncated = false,
}: Props): JSX.Element {
  const isConfigValid = AvaPluginVizConfigSchema.safeParse(vizConfig).success;
  const lookup = usePluginVizType(isConfigValid ? vizConfig : undefined);
  if (!isConfigValid) {
    return (
      <PluginVizPlaceholder
        reason="invalidSettings"
        // A stored config that fails the check can hold anything here.
        pluginId={String(vizConfig.pluginId)}
      />
    );
  }
  if (lookup.status === "loading") {
    return <PluginVizChartLoader />;
  }
  if (lookup.status === "missing") {
    return (
      <PluginVizPlaceholder
        reason="missingPlugin"
        pluginId={vizConfig.pluginId}
      />
    );
  }
  return (
    <PluginVizConfiguredChart
      lookup={lookup}
      columns={columns}
      rawColumns={rawColumns}
      data={data}
      vizConfig={vizConfig}
      isTruncated={isTruncated}
    />
  );
}
