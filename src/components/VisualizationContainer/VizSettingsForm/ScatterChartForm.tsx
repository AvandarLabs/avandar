import { Stack } from "@mantine/core";
import { VizConfigs } from "$/models/vizs/VizConfig/VizConfigs";
import { ChartSettingsFieldsets } from "@/components/VisualizationContainer/VizSettingsForm/ChartSettingsFieldsets";
import { PairSeriesFieldset } from "@/components/VisualizationContainer/VizSettingsForm/PairSeriesFieldset/PairSeriesFieldset";
import { useUpdateSettingPath } from "@/components/VisualizationContainer/VizSettingsForm/useUpdateSettingPath";
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
 * management to `PairSeriesFieldset` and renders the chart-level
 * descriptors through the shared `ChartSettingsFieldsets`.
 */
export function ScatterChartForm({
  fields,
  config,
  onConfigChange,
  layout = "stacked",
}: Props): JSX.Element {
  const updateChartPath = useUpdateSettingPath({ config, onConfigChange });

  return (
    <Stack gap="md">
      <PairSeriesFieldset
        fields={fields}
        series={config.series}
        layout={layout}
        onChange={(nextSeries: ScatterSeries[]) => {
          onConfigChange({ ...config, series: nextSeries });
        }}
      />
      <ChartSettingsFieldsets
        descriptors={VizConfigs.getDescriptors("scatter").chart}
        config={config}
        onSettingChange={updateChartPath}
        layout={layout}
      />
    </Stack>
  );
}
