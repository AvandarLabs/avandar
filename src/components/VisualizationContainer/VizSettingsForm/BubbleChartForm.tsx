import { Stack } from "@mantine/core";
import { VizConfigs } from "$/models/vizs/VizConfig/VizConfigs";
import { BubbleSeriesFieldset } from "@/components/VisualizationContainer/VizSettingsForm/BubbleSeriesFieldset/BubbleSeriesFieldset";
import { ChartSettingsFieldsets } from "@/components/VisualizationContainer/VizSettingsForm/ChartSettingsFieldsets/ChartSettingsFieldsets";
import { useUpdateSettingPath } from "@/components/VisualizationContainer/VizSettingsForm/useUpdateSettingPath";
import type { QueryResultColumn } from "$/models/queries/QueryResult/QueryResult.types";
import type { BubbleChartVizConfig } from "$/models/vizs/BubbleChartVizConfig/BubbleChartVizConfig.types";
import type { BubbleSeries } from "$/models/vizs/SeriesConfig";

type Props = {
  fields: readonly QueryResultColumn[];
  config: BubbleChartVizConfig;
  onConfigChange: (newConfig: BubbleChartVizConfig) => void;
};

/**
 * Settings form for the multi-series bubble chart. Delegates series
 * management to `BubbleSeriesFieldset` (which owns the per-series `xKey`
 * and `sizeKey` that the shared descriptor-driven series editor cannot
 * express) and the chart-level settings to `ChartSettingsFieldsets`.
 */
export function BubbleChartForm({
  fields,
  config,
  onConfigChange,
}: Props): JSX.Element {
  const updateChartPath = useUpdateSettingPath(config, onConfigChange);

  return (
    <Stack gap="sm">
      <BubbleSeriesFieldset
        fields={fields}
        series={config.series}
        onChange={(next: BubbleSeries[]) => {
          onConfigChange({ ...config, series: next });
        }}
      />
      <ChartSettingsFieldsets
        descriptors={VizConfigs.getDescriptors("bubble").chart}
        config={config}
        onSettingChange={updateChartPath}
      />
    </Stack>
  );
}
