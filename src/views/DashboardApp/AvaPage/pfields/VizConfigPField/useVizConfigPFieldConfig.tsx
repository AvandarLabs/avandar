import { useLingui } from "@lingui/react/macro";
import { CustomField } from "@puckeditor/core";
import { Dashboard } from "$/models/Dashboard/Dashboard";
import { Workspace } from "$/models/Workspace/Workspace";
import { useCallback, useMemo } from "react";
import { VizConfigPField } from "@/views/DashboardApp/AvaPage/pfields/VizConfigPField/VizConfigPField";
import type { AvaPageFieldProps } from "@/views/DashboardApp/AvaPage/AvaPage.types";
import type { VizConfig } from "$/models/vizs/VizConfig/VizConfig";

/**
 * React hook that builds the Puck `CustomField` config for editing a
 * `VizConfig`. Takes the workspace and dashboard ids at config-build time so
 * the field can resolve the right auth strategy when fetching the query
 * result columns it needs to populate its axis pickers. The field `label` is
 * translated via the Lingui macro, so this must be invoked from a React
 * component / hook.
 */
export function useVizConfigPFieldConfig(options: {
  workspaceId: Workspace.Id | undefined;
  dashboardId: Dashboard.Id;
}): CustomField<VizConfig.T> {
  const { t } = useLingui();
  const { workspaceId, dashboardId } = options;

  const render = useCallback(
    ({ value, onChange }: AvaPageFieldProps<VizConfig.T>) => {
      return (
        <VizConfigPField
          value={value}
          onChange={onChange}
          workspaceId={workspaceId}
          dashboardId={dashboardId}
        />
      );
    },
    [workspaceId, dashboardId],
  );

  return useMemo(() => {
    return {
      label: t`Visualization Settings`,
      type: "custom",
      render,
    };
  }, [t, render]);
}
