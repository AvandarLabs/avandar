import type { Model } from "@models/Model/Model.ts";
import type { UUID } from "@utils/types/common.ts";

type ModelType = "DashboardConfig";

export type DashboardConfigId = UUID<ModelType>;
export type NLPQueryId = UUID<"NLPQuery">;
export type DashboardWidgetId = UUID<"DashboardWidget">;

type NLPQuery = Model.Versioned<
  "NLPQuery",
  1,
  {
    id: NLPQueryId;
    prompt: string;
    sql: string;
  }
>;

type DashboardWidget = Model.Versioned<
  "DashboardWidget",
  1,
  {
    type: "viz";
    queryId: NLPQueryId;
    vizType: "table" | "chart";
    id: DashboardWidgetId;
  }
>;

// TODO(jpsyx): decide if we even keep this type or not since we are using
// Puck dashboard configs directly now.
export type DashboardConfig = Model.Versioned<
  ModelType,
  1,
  {
    id: DashboardConfigId;
    queries: Record<NLPQueryId, NLPQuery>;
    widgets: Record<DashboardWidgetId, DashboardWidget>;
  }
>;
