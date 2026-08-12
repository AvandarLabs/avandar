import { Trans } from "@lingui/react/macro";
import { Box, Text } from "@mantine/core";
import { createUsePuck } from "@puckeditor/core";
import { Dashboard } from "$/models/Dashboard/Dashboard";
import { StructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery";
import { Workspace } from "$/models/Workspace/Workspace";
import { useMemo } from "react";
import { VizSettingsFormBody } from "@/components/VisualizationContainer/VizSettingsForm/VizSettingsFormBody/VizSettingsFormBody";
import { NLQuery } from "@/views/DashboardApp/AvaPage/pfields/NLQueryPField/NLQueryPField";
import { useDataQuery } from "@/views/DataExplorerApp/useDataQuery";
import type { VizConfig } from "$/models/vizs/VizConfig/VizConfig";
import type { ReactElement } from "react";

const usePuckSelector = createUsePuck();

type Props = {
  /** Current viz config. */
  value: VizConfig.T;

  /** Called when the user edits any control inside the per-type subform. */
  onChange: (value: VizConfig.T) => void;

  /**
   * Workspace id used to authorize the SQL data query. When undefined the
   * field treats the dashboard as a public page and uses `dashboardId`.
   */
  workspaceId: Workspace.Id | undefined;

  /** Dashboard id used for public-page queries when `workspaceId` is unset. */
  dashboardId: Dashboard.Id;
};

/**
 * Puck custom field that renders the per-viz-type controls for a `VizConfig`.
 *
 * Reads the owning block's generated SQL from the Puck-selected item, runs
 * the SQL through `useDataQuery` to discover available columns, and renders
 * the shared `VizSettingsBody` so the same controls used in `DataExplorerApp`
 * drive dashboard visualizations. The viz-type picker itself lives as a
 * separate top-level Puck `select` field; this field only renders the
 * per-type subform.
 */
export function VizConfigPField({
  value,
  onChange,
  workspaceId,
  dashboardId,
}: Props): ReactElement {
  const selectedItem = usePuckSelector((state) => {
    return state.selectedItem;
  });
  const rawSql =
    (selectedItem?.props as { nlQuery?: NLQuery } | undefined)?.nlQuery
      ?.rawSql ?? "";

  const emptyStructuredQuery = useMemo(() => {
    return StructuredQuery.makeEmpty();
  }, []);

  const [queryResults] = useDataQuery({
    query: emptyStructuredQuery,
    rawSql: rawSql,
    ...(workspaceId !== undefined ?
      {
        auth: "workspace" as const,
        workspaceId,
      }
    : {
        auth: "public" as const,
        publicAvaPageId: dashboardId,
      }),
  });

  const columns = queryResults?.columns ?? [];
  const data = queryResults?.data ?? [];

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
