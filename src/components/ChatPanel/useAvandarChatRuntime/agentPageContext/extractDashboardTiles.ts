import { isPlainObject, isString } from "@avandar/utils";
import { collectDataVizNodes } from "@/clients/dashboards/findDashboardTile/findDashboardTile";
import { upgradeAvaPageData } from "@/views/DashboardApp/AvaPage/utils/upgradeAvaPageData";
import type { AgentPageTile } from "$/agent/pageContext/AgentPageContext";
import type { DataVizNode } from "@/clients/dashboards/findDashboardTile/findDashboardTile";
import type { AvaPageGenericData } from "@/views/DashboardApp/AvaPage/AvaPage.types";

function _readTitle(props: Record<string, unknown>): string {
  const nlQuery = isPlainObject(props["nlQuery"]) ? props["nlQuery"] : {};
  const prompt = nlQuery["prompt"];
  const title = isString(prompt) ? prompt.trim() : "";
  return title || "Untitled chart";
}

function _toTile({ props }: DataVizNode): AgentPageTile | undefined {
  const nlQuery = isPlainObject(props["nlQuery"]) ? props["nlQuery"] : {};
  const sql = nlQuery["rawSql"];
  if (!isString(sql) || sql.trim().length === 0) {
    return undefined;
  }
  const vizType = props["vizType"];
  return {
    title: _readTitle(props),
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

/**
 * One chart of a dashboard by its block id, for a mention of that tile.
 * Unlike `extractDashboardTiles`, a chart with no SQL yet is still found,
 * with empty SQL, because the user can see and mention it.
 */
export function extractDashboardTile(
  data: unknown,
  tileId: string,
): AgentPageTile | undefined {
  const node = collectDataVizNodes(data).find(({ props }) => {
    return props["id"] === tileId;
  });
  if (!node) {
    return undefined;
  }
  const nlQuery = isPlainObject(node.props["nlQuery"])
    ? node.props["nlQuery"]
    : {};
  const sql = nlQuery["rawSql"];
  const vizType = node.props["vizType"];
  return {
    title: _readTitle(node.props),
    chartType: isString(vizType) ? vizType : "table",
    sql: isString(sql) ? sql : "",
  };
}

/** A saved config's charts, upgraded first, or none when it cannot be read. */
export function extractSavedDashboardTiles(config: unknown): AgentPageTile[] {
  try {
    return extractDashboardTiles(
      upgradeAvaPageData(config as AvaPageGenericData),
    );
  } catch {
    return [];
  }
}

/** One chart of a saved config, upgraded first. */
export function extractSavedDashboardTile(
  config: unknown,
  tileId: string,
): AgentPageTile | undefined {
  try {
    return extractDashboardTile(
      upgradeAvaPageData(config as AvaPageGenericData),
      tileId,
    );
  } catch {
    return undefined;
  }
}
