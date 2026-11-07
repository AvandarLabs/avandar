import { Model } from "@avandar/models";
import type { ChatResponse } from "$/models/chat/ChatResponse/ChatResponse";
import type { ChatDashboardVizType } from "$/types/chat.types";

/**
 * How a chat response reads in the Data Explorer, where there is no
 * dashboard to add a block to.
 *
 * - `chart`: a chart block, turned into SQL for the explorer to run, plus the
 *   chart type to show its result as. The model's own text stays the reply.
 * - `dashboard_only`: a block only a dashboard can hold, such as a heading.
 * - `unchanged`: no dashboard block.
 */
export type ExplorerChatResponse =
  | { kind: "chart"; response: ChatResponse.T; vizType: ChatDashboardVizType }
  | { kind: "dashboard_only"; response: ChatResponse.T }
  | { kind: "unchanged"; response: ChatResponse.T };

/**
 * Adapts a chat response for the Data Explorer. The model has the
 * dashboard tool on every page, so "make me a chart" in the explorer can come
 * back as a chart block. Running its SQL in the explorer and switching to its
 * chart type answers the request; leaving it as a block would add nothing,
 * since no dashboard is open.
 */
export function dashboardBlockToExplorerResponse(
  response: ChatResponse.T,
): ExplorerChatResponse {
  const block = response.dashboardBlock;
  if (block === undefined) {
    return { kind: "unchanged", response };
  }
  if (block.kind === "DataViz") {
    return {
      kind: "chart",
      vizType: block.vizType,
      response: Model.make("ChatResponse", {
        assistantText: response.assistantText,
        generatedSql: { sql: block.sql, prompt: block.prompt },
      }),
    };
  }
  return {
    kind: "dashboard_only",
    response: Model.make("ChatResponse", {
      assistantText: response.assistantText,
    }),
  };
}
