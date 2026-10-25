import { useMemo } from "react";
import { Dashboard } from "$/models/Dashboard/Dashboard";
import { StructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery";
import { Workspace } from "$/models/Workspace/Workspace";
import { VizConfigContent } from "@/views/DashboardApp/AvaPage/pfields/VizConfigPField/VizConfigContent";
import { useDataQuery } from "@/views/DataExplorerApp/useDataQuery/useDataQuery";
import { useDataVizAuthoring } from "../useDataVizAuthoring/useDataVizAuthoring";
import type { VizConfig } from "$/models/vizs/VizConfig/VizConfig";
import type { ReactElement } from "react";

type Props = {
  /** Current viz config. */
  value: VizConfig.T | VizConfig.Legacy;

  /** Called when the user edits any control inside the per-type subform. */
  onChange: (value: VizConfig.T | VizConfig.Legacy) => void;

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
 * Puck custom field that renders the per-viz-type controls for a `VizConfig`.
 *
 * Shares the owning block's unfiltered bindings, previews row values, and
 * renders
 * the shared `VizSettingsBody` so the same controls used in `DataExplorerApp`
 * drive dashboard visualizations. The viz-type picker itself lives as a
 * separate top-level Puck `select` field; this field only renders the
 * per-type subform.
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
