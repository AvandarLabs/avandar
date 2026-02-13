import { DashboardPuckData } from "@/views/DashboardApp/DashboardEditorView/DashboardPuck.types";
import { createInitialDashboardPuckData } from "@/views/DashboardApp/DashboardEditorView/getDashboardPuckConfig";

export const DashboardConfigs = {
  makeEmpty: (): DashboardPuckData => {
    return createInitialDashboardPuckData({
      dashboardTitle: "Untitled dashboard",
    });
    // TODO(jpsyx): change DashboardConfig to be a Puck config
    /*
    return Models.make("DashboardConfig", {
      id: crypto.randomUUID() as DashboardConfigId,
      version: 1,
      queries: {},
      widgets: {},
    });
    */
  },
};
