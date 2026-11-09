import { isPlainObject, isString } from "@avandar/utils";
import { collectDataVizNodes } from "@/clients/dashboards/findDashboardTile/findDashboardTile";
import type { AgentPageTile } from "$/agent/pageContext/AgentPageContext";
import type { DataVizNode } from "@/clients/dashboards/findDashboardTile/findDashboardTile";

function _toTile({ props }: DataVizNode): AgentPageTile | undefined {
  const nlQuery = isPlainObject(props["nlQuery"]) ? props["nlQuery"] : {};
  const sql = nlQuery["rawSql"];
  if (!isString(sql) || sql.trim().length === 0) {
    return undefined;
  }
  const prompt = nlQuery["prompt"];
  const title = isString(prompt) ? prompt.trim() : "";
  const vizType = props["vizType"];
  return {
    title: title || "Untitled chart",
    chartType: isString(vizType) ? vizType : "table",
    sql,
  };
}

/**
 * The charts on a dashboard, in page order, from its Puck data (the editor's
 * live data or a saved config), at any nesting depth and in legacy zones.
 * The chat runtime's per-turn page block lists these so the agent knows what
 * the open dashboard shows. Reads defensively: a saved config is JSON of any
 * age, so upgrade it first if it may predate the current schema.
 */
export function extractDashboardTiles(data: unknown): AgentPageTile[] {
  return collectDataVizNodes(data).flatMap((node) => {
    const tile = _toTile(node);
    return tile ? [tile] : [];
  });
}
