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

/**
 * A name as a JSON string literal, so quotes and line breaks are escaped. Every
 * `<` becomes `\u003c`, so a name can never spell out `</current_page>`.
 */
function _quote(name: string): string {
  return JSON.stringify(name).replace(/</g, "\\u003c");
}

function _formatSql(sql: string, aliases: Aliases): string {
  const singleLine = sql.trim().replace(/\s*\n\s*/g, " ");
  const aliased = SqlTableAlias.toAliasedSql(singleLine, aliases);
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
    ? `Open dataset: ${entry.alias} = ${_quote(dataset.name)}`
    : `Open dataset: ${_quote(dataset.name)}`;
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
  const heading = `${index + 1}. ${_quote(tile.title)} (${tile.chartType})`;
  return sql === "" ? heading : `${heading}: ${sql}`;
}

function _dashboardLines(
  dashboard: NonNullable<AgentPageContext["dashboard"]>,
  aliases: Aliases,
): string[] {
  const listed = dashboard.tiles.slice(0, MAX_PAGE_TILES);
  const hiddenCount = dashboard.tiles.length - listed.length;
  return [
    `Dashboard: ${_quote(dashboard.name)}`,
    ...(listed.length > 0 ? ["Charts on this dashboard:"] : []),
    ...listed.map((tile, index) => {
      return _tileLine(tile, index, aliases);
    }),
    ...(hiddenCount > 0
      ? [
          `${hiddenCount} more ${hiddenCount === 1 ? "chart" : "charts"} not listed.`,
        ]
      : []),
  ];
}

function _caseLines(context: AgentPageContext): string[] {
  return [
    ...(context.caseType
      ? [`Case type: ${_quote(context.caseType.name)}`]
      : []),
    ...(context.app === "case"
      ? ["One case is open; its details are not shared."]
      : []),
  ];
}

/**
 * The block that starts each agent turn's message: what the user has on
 * screen, so "this dataset" or "this chart" resolves. Table names in
 * `aliases` are shown as their alias. Names are written as quoted JSON
 * strings and SQL is collapsed to one line, so neither can start a new line
 * or end the block.
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
    ...(context.map ? [`Map: ${_quote(context.map.name)}`] : []),
    ..._caseLines(context),
  ];
  return ["<current_page>", ...lines, "</current_page>"].join("\n");
}
