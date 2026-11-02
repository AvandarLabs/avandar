import { Stack } from "@mantine/core";
import { AvaVizConfigs } from "$/models/vizs/AvaVizConfig/AvaVizConfigs";
import { ChartSettingsFieldsets } from "@/components/VisualizationContainer/VizSettingsForm/ChartSettingsFieldsets";
import { PairSeriesFieldset } from "@/components/VisualizationContainer/VizSettingsForm/PairSeriesFieldset/PairSeriesFieldset";
import { useUpdateSettingPath } from "@/components/VisualizationContainer/VizSettingsForm/useUpdateSettingPath";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import type { AvaScatterPlotVizConfig } from "$/models/vizs/AvaScatterPlotVizConfig/AvaScatterPlotVizConfig.types";
import type { AvaScatterSeries } from "$/models/vizs/SeriesConfig";
import type { SettingsColumnsLayout } from "@/components/SettingsColumns/SettingsColumns";

type Props = {
  fields: readonly QueryResult.ColumnWithId[];
  config: AvaScatterPlotVizConfig;
  onConfigChange: (newConfig: AvaScatterPlotVizConfig) => void;

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
        onChange={(nextSeries: AvaScatterSeries[]) => {
          onConfigChange({ ...config, series: nextSeries });
        }}
      />
      <ChartSettingsFieldsets
        descriptors={AvaVizConfigs.getDescriptors("scatter").chart}
        config={config}
        onSettingChange={updateChartPath}
        layout={layout}
      />
    </Stack>
  );
}
