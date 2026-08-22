import type { VizConfig } from "$/models/vizs/VizConfig/VizConfig";
import type { ReactElement } from "react";

import { Trans } from "@lingui/react/macro";
import { Box, Text } from "@mantine/core";

import { VizSettingsFormBody } from "@/components/VisualizationContainer/VizSettingsForm/VizSettingsFormBody/VizSettingsFormBody";

type Props = {
  value: VizConfig.T;
  onChange: (value: VizConfig.T) => void;
  rawSql: string;
  columns: Parameters<typeof VizSettingsFormBody>[0]["columns"];
  data: Parameters<typeof VizSettingsFormBody>[0]["data"];
};

/**
 * The per-visualization settings body, or the reason there is nothing to
 * configure: a table has no extra settings, and a viz with no query yet has
 * no columns to bind controls to.
 */
export function VizConfigContent({
  value,
  onChange,
  rawSql,
  columns,
  data,
}: Readonly<Props>): ReactElement {
  if (value.vizType === "table") {
    return (
      <Box>
        <Text c="dimmed" fz="sm">
          <Trans>The table visualization has no extra settings.</Trans>
        </Text>
      </Box>
    );
  }
  if (rawSql.trim().length === 0) {
    return (
      <Box>
        <Text c="dimmed" fz="sm">
          <Trans>Generate a query to configure this visualization.</Trans>
        </Text>
      </Box>
    );
  }
  return (
    <Box>
      <VizSettingsFormBody
        columns={columns}
        data={data}
        vizConfig={value}
        onVizConfigChange={onChange}
      />
    </Box>
  );
}
