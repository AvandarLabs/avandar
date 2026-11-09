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

/** A run of line breaks (CR, LF, line and paragraph separators) and spaces. */
const LINE_BREAKS = /\s*[\r\n\u2028\u2029]+\s*/g;

/**
 * A `<` that would start `<current_page>` or `</current_page>`, including
 * spellings with spaces such as `< /current_page>` or `</ current_page>`.
 */
const PAGE_TAG_START = /<(?=\s*\/?\s*current_page)/gi;

type Aliases = readonly SqlTableAlias.T[];

/**
 * A name as a JSON string literal, so quotes and line breaks are escaped,
 * including the line and paragraph separators JSON leaves raw. Every `<`
 * becomes `\u003c`, so a name can never spell out `</current_page>`.
 */
function _quote(name: string): string {
  return JSON.stringify(name)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

/**
 * Text that is not quoted (column names, types, chart types) kept on one
 * line: line breaks become spaces and every `<` becomes `\u003c`, so it can
 * neither start a new line nor spell out `</current_page>`.
 */
function _inline(text: string): string {
  return text.replace(LINE_BREAKS, " ").replace(/</g, "\\u003c");
}

/**
 * One SQL statement on a single line, with table names shown as aliases and
 * cut at the cap. Only a `<` that would start a page tag is escaped, so
 * comparisons such as `a < b` stay readable.
 */
function _formatSql(sql: string, aliases: Aliases): string {
  const singleLine = sql.trim().replace(LINE_BREAKS, " ");
  const aliased = SqlTableAlias.toAliasedSql(singleLine, aliases).replace(
    PAGE_TAG_START,
    "\\u003c",
  );
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
    return `${_inline(column.name)} ${_inline(column.dataType)}`;
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
  const heading = `${index + 1}. ${_quote(tile.title)} (${_inline(tile.chartType)})`;
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
