import { Trans } from "@lingui/react/macro";
import { Stack, Text } from "@mantine/core";
import { VizSettingsFormBody } from "@/components/VisualizationContainer/VizSettingsForm/VizSettingsFormBody/VizSettingsFormBody";
import css from "@/views/DataExplorerApp/DataExplorerDrawer/VizTabPanel/VizTabPanel.module.css";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import type { AvaVizConfig } from "$/models/vizs/AvaVizConfig/AvaVizConfig";
import type { UnknownDataFrame } from "@avandar/utils";
import type { ReactNode } from "react";

type Props = {
  columns: readonly QueryResult.ColumnWithId[];
  data: UnknownDataFrame;
  vizConfig: AvaVizConfig.T;

  /**
   * The column the canvas splits the chart by, drawing one series per value.
   * Undefined when the chart is drawn as configured.
   */
  splitColumnName: string | undefined;

  onVizConfigChange: (vizConfig: AvaVizConfig.T) => void;
};

/**
 * Body of the drawer's Visualizations tab. Renders the settings for the active
 * visualization type across columns, or an explanation when there is nothing
 * to configure. The type picker itself lives in the drawer rail, because
 * changing it replaces every control below. When the canvas splits the chart
 * by a column, a note above the settings says so, since the series list
 * still shows the one series the split came from.
 */
export function VizTabPanel({
  columns,
  data,
  vizConfig,
  splitColumnName,
  onVizConfigChange,
}: Props): ReactNode {
  if (columns.length === 0) {
    return (
      <Stack gap={4} className={css.emptyState}>
        <Text size="sm" fw={600} c="neutral.7">
          <Trans>Run a query to configure a chart.</Trans>
        </Text>
        <Text size="xs" c="neutral.6">
          <Trans>
            Chart settings appear once the query returns some columns.
          </Trans>
        </Text>
      </Stack>
    );
  }

  if (vizConfig.vizType === "table") {
    return (
      <Stack gap={4} className={css.emptyState}>
        <Text size="sm" fw={600} c="neutral.7">
          <Trans>Table view has no chart settings.</Trans>
        </Text>
        <Text size="xs" c="neutral.6">
          <Trans>Pick a chart type above to configure one.</Trans>
        </Text>
      </Stack>
    );
  }

  return (
    <>
      {splitColumnName === undefined ? null : (
        <Text size="xs" c="neutral.6" className={css.splitNote}>
          <Trans>
            Drawn as one series per {splitColumnName}. Colors are set for you.
            Adding a second series turns this off.
          </Trans>
        </Text>
      )}
      <VizSettingsFormBody
        columns={columns}
        data={data}
        vizConfig={vizConfig}
        onVizConfigChange={onVizConfigChange}
        layout="columns"
      />
    </>
  );
}
