import { PairSeriesFieldset } from "@/components/VisualizationContainer/VizSettingsForm/PairSeriesFieldset/PairSeriesFieldset";
import type { SettingsColumnsLayout } from "@/components/SettingsColumns/SettingsColumns";
import type { QueryResultColumn } from "$/models/queries/QueryResult/QueryResult.types";
import type { ScatterPlotVizConfig } from "$/models/vizs/ScatterPlotVizConfig/ScatterPlotVizConfig.types";
import type { ScatterSeries } from "$/models/vizs/SeriesConfig";

type Props = {
  fields: readonly QueryResultColumn[];
  config: ScatterPlotVizConfig;
  onConfigChange: (newConfig: ScatterPlotVizConfig) => void;

  /** How the setting groups are arranged. Defaults to a vertical stack. */
  layout?: SettingsColumnsLayout;
};

/**
 * Settings form for the multi-series scatter plot. Delegates series
 * management to `PairSeriesFieldset`.
 */
export function ScatterChartForm({
  fields,
  config,
  onConfigChange,
  layout = "stacked",
}: Props): JSX.Element {
  return (
    <PairSeriesFieldset
      fields={fields}
      series={config.series}
      layout={layout}
      onChange={(nextSeries: ScatterSeries[]) => {
        onConfigChange({ ...config, series: nextSeries });
      }}
    />
  );
}
