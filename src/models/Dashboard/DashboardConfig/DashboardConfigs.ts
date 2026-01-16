import { Models } from "@/models/Model";
import { DashboardConfig, DashboardConfigId } from "./DashboardConfig.types";

export const DashboardConfigs = {
  makeEmpty: (): DashboardConfig => {
    return Models.make("DashboardConfig", {
      id: crypto.randomUUID() as DashboardConfigId,
      version: 1,
      queries: {},
      widgets: {},
    });
  },
};
