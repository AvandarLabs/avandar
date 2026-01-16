import type { VersionedModel } from "@/models/Model";
import type { UUID } from "$/lib/types/common";

type ModelType = "DashboardConfig";

export type DashboardConfigId = UUID<ModelType>;
export type NLPQueryId = UUID<"NLPQuery">;
export type DashboardWidgetId = UUID<"DashboardWidget">;

type NLPQuery = VersionedModel<
  "NLPQuery",
  1,
  {
    id: NLPQueryId;
    prompt: string;
    sql: string;
  }
>;

type DashboardWidget = VersionedModel<
  "DashboardWidget",
  1,
  {
    type: "viz";
    queryId: NLPQueryId;
    vizType: "table" | "chart";
    id: DashboardWidgetId;
  }
>;

export type DashboardConfig = VersionedModel<
  ModelType,
  1,
  {
    id: DashboardConfigId;
    queries: Record<NLPQueryId, NLPQuery>;
    widgets: Record<DashboardWidgetId, DashboardWidget>;
  }
>;
