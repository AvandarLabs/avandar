import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import type { VizConfig } from "$/models/vizs/VizConfig/VizConfig";
import type { UnknownDataFrame } from "@avandar/utils";
import type { ReactNode } from "react";

import { Trans } from "@lingui/react/macro";
import { Stack, Text } from "@mantine/core";

import { VizSettingsFormBody } from "@/components/VisualizationContainer/VizSettingsForm/VizSettingsFormBody/VizSettingsFormBody";
import css from "@/views/DataExplorerApp/DataExplorerDrawer/VizTabPanel/VizTabPanel.module.css";

type Props = {
  columns: readonly QueryResult.Column[];
  data: UnknownDataFrame;
  vizConfig: VizConfig.T;
  onVizConfigChange: (vizConfig: VizConfig.T) => void;
};

/**
 * Body of the drawer's Visualizations tab. Renders the settings for the active
 * visualization type across columns, or an explanation when there is nothing
 * to configure. The type picker itself lives in the drawer rail, because
 * changing it replaces every control below.
 */
export function VizTabPanel({
  columns,
  data,
  vizConfig,
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
    <VizSettingsFormBody
      columns={columns}
      data={data}
      vizConfig={vizConfig}
      onVizConfigChange={onVizConfigChange}
      layout="columns"
    />
  );
}
