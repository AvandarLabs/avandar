import { Stack } from "@mantine/core";
import { VizConfigs } from "$/models/vizs/VizConfig/VizConfigs";
import { BubbleSeriesFieldset } from "@/components/VisualizationContainer/VizSettingsForm/BubbleSeriesFieldset/BubbleSeriesFieldset";
import { ChartSettingsFieldsets } from "@/components/VisualizationContainer/VizSettingsForm/ChartSettingsFieldsets/ChartSettingsFieldsets";
import { useUpdateSettingPath } from "@/components/VisualizationContainer/VizSettingsForm/useUpdateSettingPath";
import type { SettingsColumnsLayout } from "@/components/SettingsColumns/SettingsColumns";
import type { QueryResultColumn } from "$/models/queries/QueryResult/QueryResult.types";
import type { BubbleChartVizConfig } from "$/models/vizs/BubbleChartVizConfig/BubbleChartVizConfig.types";
import type { BubbleSeries } from "$/models/vizs/SeriesConfig";

type Props = {
  fields: readonly QueryResultColumn[];
  config: BubbleChartVizConfig;
  onConfigChange: (newConfig: BubbleChartVizConfig) => void;

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
        onChange={(nextSeries: BubbleSeries[]) => {
          onConfigChange({ ...config, series: nextSeries });
        }}
      />
      <ChartSettingsFieldsets
        descriptors={VizConfigs.getDescriptors("bubble").chart}
        config={config}
        onSettingChange={updateChartPath}
        layout={layout}
      />
    </Stack>
  );
}
