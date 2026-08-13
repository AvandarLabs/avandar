import { Stack } from "@mantine/core";
import { VizConfigs } from "$/models/vizs/VizConfig/VizConfigs";
import { ChartSettingsFieldsets } from "@/components/VisualizationContainer/VizSettingsForm/ChartSettingsFieldsets/ChartSettingsFieldsets";
import { PairSeriesFieldset } from "@/components/VisualizationContainer/VizSettingsForm/PairSeriesFieldset/PairSeriesFieldset";
import { useUpdateSettingPath } from "@/components/VisualizationContainer/VizSettingsForm/useUpdateSettingPath";
import type { QueryResultColumn } from "$/models/queries/QueryResult/QueryResult.types";
import type { ScatterPlotVizConfig } from "$/models/vizs/ScatterPlotVizConfig/ScatterPlotVizConfig.types";
import type { ScatterSeries } from "$/models/vizs/SeriesConfig";

type Props = {
  fields: readonly QueryResultColumn[];
  config: ScatterPlotVizConfig;
  onConfigChange: (newConfig: ScatterPlotVizConfig) => void;
};

/**
 * Settings form for the multi-series scatter plot. Delegates series
 * management to `PairSeriesFieldset` (which owns the per-series `xKey`
 * that the shared descriptor-driven series editor cannot express) and
 * the chart-level settings to `ChartSettingsFieldsets`.
 */
export function ScatterChartForm({
  fields,
  config,
  onConfigChange,
}: Props): JSX.Element {
  const updateChartPath = useUpdateSettingPath(config, onConfigChange);

  return (
    <Stack gap="sm">
      <PairSeriesFieldset
        fields={fields}
        series={config.series}
        onChange={(next: ScatterSeries[]) => {
          onConfigChange({ ...config, series: next });
        }}
      />
      <ChartSettingsFieldsets
        descriptors={VizConfigs.getDescriptors("scatter").chart}
        config={config}
        onSettingChange={updateChartPath}
      />
    </Stack>
  );
}
