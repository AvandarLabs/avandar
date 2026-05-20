import { Stack } from "@mantine/core";
import { PairSeriesFieldset } from "@/components/VisualizationContainer/VizSettingsForm/PairSeriesFieldset";
import type { QueryResultColumn } from "$/models/queries/QueryResult/QueryResult.types";
import type { ScatterSeries } from "$/models/vizs/SeriesConfig";
import type { ScatterPlotVizConfig } from "$/models/vizs/ScatterPlotVizConfig/ScatterPlotVizConfig.types";

type Props = {
  fields: readonly QueryResultColumn[];
  config: ScatterPlotVizConfig;
  onConfigChange: (newConfig: ScatterPlotVizConfig) => void;
};

/**
 * Settings form for the multi-series scatter plot. Delegates series
 * management to `PairSeriesFieldset`.
 */
export function ScatterChartForm({ fields, config, onConfigChange }: Props): JSX.Element {
  return (
    <Stack gap="sm">
      <PairSeriesFieldset
        fields={fields}
        series={config.series}
        onChange={(next: ScatterSeries[]) => {
          onConfigChange({ ...config, series: next });
        }}
      />
    </Stack>
  );
}
