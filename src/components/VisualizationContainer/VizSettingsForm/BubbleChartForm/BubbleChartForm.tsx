import { Stack } from "@mantine/core";
import { AvaVizConfigs } from "$/models/vizs/AvaVizConfig/AvaVizConfigs";
import { BubbleSeriesFieldset } from "@/components/VisualizationContainer/VizSettingsForm/BubbleSeriesFieldset/BubbleSeriesFieldset";
import { ChartSettingsFieldsets } from "@/components/VisualizationContainer/VizSettingsForm/ChartSettingsFieldsets";
import { useUpdateSettingPath } from "@/components/VisualizationContainer/VizSettingsForm/useUpdateSettingPath";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import type { AvaBubbleChartVizConfig } from "$/models/vizs/AvaBubbleChartVizConfig/AvaBubbleChartVizConfig.types";
import type { AvaBubbleSeries } from "$/models/vizs/series.types";
import type { SettingsColumnsLayout } from "@/components/SettingsColumns/SettingsColumns";

type Props = {
  fields: readonly QueryResult.ColumnWithId[];
  config: AvaBubbleChartVizConfig;
  onConfigChange: (newConfig: AvaBubbleChartVizConfig) => void;

  /** How the setting groups are arranged. Defaults to a vertical stack. */
  layout?: SettingsColumnsLayout;
};

/**
 * Settings form for the multi-series bubble chart. Delegates series
 * management to `BubbleSeriesFieldset` and renders the chart-level
 * descriptors through the shared `ChartSettingsFieldsets`.
 */
export function BubbleChartForm({
  fields,
  config,
  onConfigChange,
  layout = "stacked",
}: Props): JSX.Element {
  const updateChartPath = useUpdateSettingPath({ config, onConfigChange });

  return (
    <Stack gap="md">
      <BubbleSeriesFieldset
        fields={fields}
        series={config.series}
        layout={layout}
        onChange={(nextSeries: AvaBubbleSeries[]) => {
          onConfigChange({ ...config, series: nextSeries });
        }}
      />
      <ChartSettingsFieldsets
        descriptors={AvaVizConfigs.getDescriptors("bubble").chart}
        config={config}
        onSettingChange={updateChartPath}
        layout={layout}
      />
    </Stack>
  );
}
