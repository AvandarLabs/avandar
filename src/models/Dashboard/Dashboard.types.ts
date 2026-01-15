import { VersionedModel } from "../Model/Model.types";

type ModelType = "Dashboard";

type NLPQuery = VersionedModel<
  "NLPQuery",
  1,
  {
    prompt: string;
    sql: string;
  }
>;

type NLPQueryId = NLPQuery["id"];

type DashboardWidget = VersionedModel<
  "Widget",
  1,
  {
    type: "viz";
    queryId: NLPQueryId;
    vizType: "table" | "chart";
  }
>;
type DashboardWidgetId = DashboardWidget["id"];

export type Dashboard = VersionedModel<
  ModelType,
  1,
  {
    name: string;
    slug: string;
    createdAt: string;
    updatedAt: string;
    queries: Record<NLPQueryId, NLPQuery>;
    widgets: Record<DashboardWidgetId, DashboardWidget>;
  }
>;

export type DashboardId = Dashboard["id"];
