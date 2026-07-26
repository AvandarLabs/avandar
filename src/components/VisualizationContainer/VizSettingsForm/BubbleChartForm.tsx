import { Stack } from "@mantine/core";
import { BubbleSeriesFieldset } from "@/components/VisualizationContainer/VizSettingsForm/BubbleSeriesFieldset/BubbleSeriesFieldset";
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
 * management to `BubbleSeriesFieldset`.
 */
export function BubbleChartForm({
  fields,
  config,
  onConfigChange,
}: Props): JSX.Element {
  return (
    <Stack gap="sm">
      <BubbleSeriesFieldset
        fields={fields}
        series={config.series}
        onChange={(next: BubbleSeries[]) => {
          onConfigChange({ ...config, series: next });
        }}
      />
    </Stack>
  );
}
