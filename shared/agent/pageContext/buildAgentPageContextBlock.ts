import {
  MAX_PAGE_SQL_CHARACTERS,
  MAX_PAGE_TILES,
} from "$/agent/pageContext/AgentPageContext.ts";
import { SqlTableAlias } from "$/models/chat/SqlTableAlias/SqlTableAlias.ts";
import type {
  AgentPageApp,
  AgentPageContext,
  AgentPageTile,
} from "$/agent/pageContext/AgentPageContext.ts";

const APP_LABELS: Record<AgentPageApp, string> = {
  "data-explorer": "Data Explorer",
  dashboards: "Dashboard list",
  dashboard: "Dashboard",
  dataset: "Dataset",
  "data-sources": "Data sources",
  map: "Map",
  "case-type": "Case type",
  case: "Case",
  "case-manager": "Case designer",
  other: "Other",
};

type Aliases = readonly SqlTableAlias.T[];

function _formatSql(sql: string, aliases: Aliases): string {
  const aliased = SqlTableAlias.toAliasedSql(sql.trim(), aliases);
  return aliased.length > MAX_PAGE_SQL_CHARACTERS
    ? `${aliased.slice(0, MAX_PAGE_SQL_CHARACTERS)} ...`
    : aliased;
}

function _datasetLine(
  dataset: NonNullable<AgentPageContext["dataset"]>,
  aliases: Aliases,
): string {
  const entry = aliases.find((candidate) => {
    return candidate.kind === "dataset" && candidate.datasetId === dataset.id;
  });
  return entry
    ? `Open dataset: ${entry.alias} = "${dataset.name}"`
    : `Open dataset: "${dataset.name}"`;
}

function _explorerLines(
  explorer: NonNullable<AgentPageContext["explorer"]>,
  aliases: Aliases,
): string[] {
  const columns = explorer.resultColumns.map((column) => {
    return `${column.name} ${column.dataType}`;
  });
  return [
    ...(explorer.sql
      ? [`Query on screen: ${_formatSql(explorer.sql, aliases)}`]
      : []),
    ...(columns.length > 0 ? [`Result columns: ${columns.join(", ")}`] : []),
  ];
}

function _tileLine(
  tile: AgentPageTile,
  index: number,
  aliases: Aliases,
): string {
  const sql = _formatSql(tile.sql, aliases);
  return `${index + 1}. "${tile.title}" (${tile.chartType}): ${sql}`;
}

function _dashboardLines(
  dashboard: NonNullable<AgentPageContext["dashboard"]>,
  aliases: Aliases,
): string[] {
  const listed = dashboard.tiles.slice(0, MAX_PAGE_TILES);
  const hiddenCount = dashboard.tiles.length - listed.length;
  return [
    `Dashboard: "${dashboard.name}"`,
    ...(listed.length > 0 ? ["Charts on this dashboard:"] : []),
    ...listed.map((tile, index) => {
      return _tileLine(tile, index, aliases);
    }),
    ...(hiddenCount > 0 ? [`${hiddenCount} more charts not listed.`] : []),
  ];
}

function _caseTypeLines(context: AgentPageContext): string[] {
  if (!context.caseType) {
    return [];
  }
  return [
    `Case type: "${context.caseType.name}"`,
    ...(context.app === "case"
      ? ["One case is open; its details are not shared."]
      : []),
  ];
}

/**
 * The block that starts each agent turn's message: what the user has on
 * screen, so "this dataset" or "this chart" resolves. SQL shows prompt
 * aliases (`t0`), never DuckDB table names. Shared by the browser and the
 * eval, so both send the same text.
 */
export function buildAgentPageContextBlock(
  options: Readonly<{ context: AgentPageContext; aliases: Aliases }>,
): string {
  const { context, aliases } = options;
  const lines = [
    `Page: ${APP_LABELS[context.app]}`,
    ...(context.dataset ? [_datasetLine(context.dataset, aliases)] : []),
    ...(context.explorer ? _explorerLines(context.explorer, aliases) : []),
    ...(context.dashboard ? _dashboardLines(context.dashboard, aliases) : []),
    ...(context.map ? [`Map: "${context.map.name}"`] : []),
    ..._caseTypeLines(context),
  ];
  return ["<current_page>", ...lines, "</current_page>"].join("\n");
}
