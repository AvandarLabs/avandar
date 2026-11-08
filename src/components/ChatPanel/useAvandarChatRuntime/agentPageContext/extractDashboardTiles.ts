import type { AgentPageTile } from "$/agent/pageContext/AgentPageContext";

/** Deep enough for any layout block nesting a dashboard uses. */
const MAX_DEPTH = 8;

type DataVizLike = {
  type?: unknown;
  props?: {
    vizType?: unknown;
    nlQuery?: { prompt?: unknown; rawSql?: unknown };
  };
};

function _toTile(item: DataVizLike): AgentPageTile | undefined {
  const sql = item.props?.nlQuery?.rawSql;
  if (typeof sql !== "string" || sql.trim().length === 0) {
    return undefined;
  }
  const prompt = item.props?.nlQuery?.prompt;
  const title = typeof prompt === "string" ? prompt.trim() : "";
  const vizType = item.props?.vizType;
  return {
    title: title || "Untitled chart",
    chartType: typeof vizType === "string" ? vizType : "table",
    sql,
  };
}

function _collect(value: unknown, depth: number, tiles: AgentPageTile[]): void {
  if (depth > MAX_DEPTH || value === null || typeof value !== "object") {
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => {
      _collect(item, depth + 1, tiles);
    });
    return;
  }
  const item = value as DataVizLike;
  const tile = item.type === "DataViz" ? _toTile(item) : undefined;
  if (tile) {
    tiles.push(tile);
    return;
  }
  Object.values(value).forEach((child) => {
    _collect(child, depth + 1, tiles);
  });
}

/**
 * The charts on a dashboard, in page order, from its Puck data (the editor's
 * live data or a saved config). Reads defensively: a saved config is JSON
 * of any age.
 */
export function extractDashboardTiles(data: unknown): AgentPageTile[] {
  const content = (data as { content?: unknown } | undefined)?.content;
  if (!Array.isArray(content)) {
    return [];
  }
  const tiles: AgentPageTile[] = [];
  _collect(content, 0, tiles);
  return tiles;
}
