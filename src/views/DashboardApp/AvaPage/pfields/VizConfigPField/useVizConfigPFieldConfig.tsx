import { useLingui } from "@lingui/react/macro";
import { CustomField } from "@puckeditor/core";
import { useCallback, useMemo } from "react";
import { Dashboard } from "$/models/Dashboard/Dashboard";
import { Workspace } from "$/models/Workspace/Workspace";
import { VizConfigPField } from "@/views/DashboardApp/AvaPage/pfields/VizConfigPField/VizConfigPField";
import type { AvaVizConfig } from "$/models/vizs/AvaVizConfig/AvaVizConfig";
import type { UiVizConfig } from "$/models/vizs/UiVizConfig/UiVizConfig.types";
import type { AvaPageFieldProps } from "@/views/DashboardApp/AvaPage/AvaPage.types";

/**
 * React hook that builds the Puck `CustomField` config for editing a
 * `AvaVizConfig`. Takes the workspace and dashboard ids at config-build time so
 * the field can resolve the right auth strategy when fetching the query
 * result columns it needs to populate its axis pickers. The field `label` is
 * translated via the Lingui macro, so this must be invoked from a React
 * component / hook.
 */
export function useVizConfigPFieldConfig(options: {
  workspaceId: Workspace.Id | undefined;
  dashboardId: Dashboard.Id;
  snapshotRevision?: string;
}): CustomField<AvaVizConfig.T | UiVizConfig> {
  const { t } = useLingui();
  const { workspaceId, dashboardId, snapshotRevision } = options;

  const render = useCallback(
    ({ value, onChange }: AvaPageFieldProps<AvaVizConfig.T | UiVizConfig>) => {
      return (
        <VizConfigPField
          value={value}
          onChange={onChange}
          workspaceId={workspaceId}
          dashboardId={dashboardId}
          snapshotRevision={snapshotRevision ?? ""}
        />
      );
    },
    [workspaceId, dashboardId, snapshotRevision],
  );

  return useMemo(() => {
    return {
      label: t`Visualization Settings`,
      type: "custom",
      render,
    };
  }, [t, render]);
}
