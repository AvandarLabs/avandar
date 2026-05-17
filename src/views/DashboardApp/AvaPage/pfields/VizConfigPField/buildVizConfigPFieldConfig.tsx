import { CustomField } from "@puckeditor/core";
import { DashboardId } from "$/models/Dashboard/Dashboard.types";
import { Workspace } from "$/models/Workspace/Workspace";
import { VizConfigPField } from "@/views/DashboardApp/AvaPage/pfields/VizConfigPField/VizConfigPField";
import type { VizConfig } from "$/models/vizs/VizConfig/VizConfig.types";

/**
 * Builds the Puck `CustomField` config for editing a `VizConfig`. Takes the
 * workspace and dashboard ids at config-build time so the field can resolve
 * the right auth strategy when fetching the query result columns it needs to
 * populate its axis pickers.
 */
export function buildVizConfigPFieldConfig(options: {
  workspaceId: Workspace.Id | undefined;
  dashboardId: DashboardId;
}): CustomField<VizConfig> {
  return {
    label: "Visualization Settings",
    type: "custom",
    render: ({ value, onChange }) => {
      return (
        <VizConfigPField
          value={value}
          onChange={onChange}
          workspaceId={options.workspaceId}
          dashboardId={options.dashboardId}
        />
      );
    },
  };
}
