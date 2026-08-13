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

/** Renders settings for a multi-series scatter plot. */
export function ScatterChartForm({
  fields,
  config,
  onConfigChange,
}: Props): JSX.Element {
  const updateChartPath = useUpdateSettingPath({ config, onConfigChange });

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
