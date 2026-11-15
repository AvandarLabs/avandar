import { useMemo } from "react";
import { Dashboard } from "$/models/Dashboard/Dashboard";
import { StructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery";
import { Workspace } from "$/models/Workspace/Workspace";
import { VizConfigContent } from "@/views/DashboardApp/AvaPage/pfields/VizConfigPField/VizConfigContent";
import { useDataQuery } from "@/views/DataExplorerApp/useDataQuery/useDataQuery";
import { useDataVizAuthoring } from "../useDataVizAuthoring/useDataVizAuthoring";
import type { AvaVizConfig } from "$/models/vizs/AvaVizConfig/AvaVizConfig";
import type { UiVizConfig } from "$/models/vizs/UiVizConfig/UiVizConfig.types";
import type { ReactElement } from "react";

type Props = {
  /** Current viz config. */
  value: AvaVizConfig.T | UiVizConfig;

  /** Called when the user edits any control inside the per-type subform. */
  onChange: (value: AvaVizConfig.T | UiVizConfig) => void;

  /**
   * Workspace id used to authorize the SQL data query. When undefined the
   * field treats the dashboard as a public page and uses `dashboardId`.
   */
  workspaceId: Workspace.Id | undefined;

  /** Dashboard id used for public-page queries when `workspaceId` is unset. */
  dashboardId: Dashboard.Id;

  /** Revision of the published snapshot used by public-page queries. */
  snapshotRevision: string;
};

/**
 * Puck custom field for a DataViz block's per-viz-type settings, such as axis
 * pickers and the legend toggle, built from the `VizSettingsFormBody` the
 * Data Explorer also uses. It reads and edits the selected block through
 * `useDataVizAuthoring`, so edits bind to the chart's column IDs. Use it as
 * the `vizConfig` field of a chart block, for example the dashboard's DataViz
 * block. The viz type picker is a separate field.
 */
export function VizConfigPField({
  workspaceId,
  dashboardId,
  snapshotRevision,
}: Readonly<Props>): ReactElement {
  const auth = workspaceId
    ? { auth: "workspace" as const, workspaceId }
    : {
        auth: "public" as const,
        publicAvaPageId: dashboardId,
        snapshotRevision,
      };
  const authoring = useDataVizAuthoring(auth);
  const query = useMemo(() => {
    return StructuredQuery.makeEmpty();
  }, []);
  const [result] = useDataQuery({
    query,
    rawSql: authoring.props.nlQuery.rawSql,
    enabled: authoring.status === "ready",
    analyticsSurface: "viz_config",
    ...auth,
  });
  return (
    <VizConfigContent
      value={authoring.runtime?.runtimeConfig ?? { vizType: "table" }}
      onChange={(vizConfig) => {
        return authoring.update({ vizConfig });
      }}
      rawSql={authoring.props.nlQuery.rawSql}
      columns={authoring.schema?.columns ?? []}
      data={result?.data ?? []}
    />
  );
}
