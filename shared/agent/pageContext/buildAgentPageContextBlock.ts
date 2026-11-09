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

/** A chart's title in the block when its own looks like personal data. */
const REDACTED_TILE_TITLE = "Untitled chart";

type Aliases = readonly SqlTableAlias.T[];

/** True when a piece of page text looks like personal data. */
type IsSensitive = (text: string) => boolean;

/** Page SQL with its personal values hidden, before it leaves the device. */
type RedactSql = (sql: string) => string;

type SqlOptions = Readonly<{ aliases: Aliases; redactSql?: RedactSql }>;

type TileOptions = SqlOptions & Readonly<{ isSensitive?: IsSensitive }>;

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
 * One SQL statement on a single line, with personal values hidden by
 * `redactSql`, table names shown as aliases, and cut at the cap. Values are
 * hidden first, on the SQL as stored. Only a `<` that would start a page tag
 * is escaped, so comparisons such as `a < b` stay readable.
 */
function _formatSql(sql: string, options: SqlOptions): string {
  const { aliases, redactSql } = options;
  const redacted = redactSql ? redactSql(sql) : sql;
  const singleLine = redacted.trim().replace(LINE_BREAKS, " ");
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
  options: SqlOptions,
): string[] {
  const columns = explorer.resultColumns.map((column) => {
    return `${_inline(column.name)} ${_inline(column.dataType)}`;
  });
  return [
    ...(explorer.sql
      ? [`Query on screen: ${_formatSql(explorer.sql, options)}`]
      : []),
    ...(columns.length > 0 ? [`Result columns: ${columns.join(", ")}`] : []),
  ];
}

/**
 * One chart's line. With `isSensitive`, a title that looks like personal
 * data becomes "Untitled chart".
 */
function _tileLine(
  tile: AgentPageTile,
  index: number,
  options: TileOptions,
): string {
  const { isSensitive } = options;
  const title =
    isSensitive && isSensitive(tile.title) ? REDACTED_TILE_TITLE : tile.title;
  const sql = _formatSql(tile.sql, options);
  const heading = `${index + 1}. ${_quote(title)} (${_inline(tile.chartType)})`;
  return sql === "" ? heading : `${heading}: ${sql}`;
}

function _dashboardLines(
  dashboard: NonNullable<AgentPageContext["dashboard"]>,
  options: TileOptions,
): string[] {
  const listed = dashboard.tiles.slice(0, MAX_PAGE_TILES);
  const hiddenCount = dashboard.tiles.length - listed.length;
  return [
    `Dashboard: ${_quote(dashboard.name)}`,
    ...(listed.length > 0 ? ["Charts on this dashboard:"] : []),
    ...listed.map((tile, index) => {
      return _tileLine(tile, index, options);
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
 *
 * `redactSql` hides personal values in page SQL (dashboard charts and the
 * Data Explorer's query) before the block leaves the device, for example by
 * swapping them for placeholders the browser maps back. `isSensitive` flags
 * chart titles that look like personal data, which become "Untitled chart".
 */
export function buildAgentPageContextBlock(
  options: Readonly<{
    context: AgentPageContext;
    aliases: Aliases;
    isSensitive?: IsSensitive;
    redactSql?: RedactSql;
  }>,
): string {
  const { context, aliases } = options;
  const lines = [
    `Page: ${APP_LABELS[context.app]}`,
    ...(context.dataset ? [_datasetLine(context.dataset, aliases)] : []),
    ...(context.explorer ? _explorerLines(context.explorer, options) : []),
    ...(context.dashboard ? _dashboardLines(context.dashboard, options) : []),
    ...(context.map ? [`Map: ${_quote(context.map.name)}`] : []),
    ..._caseLines(context),
  ];
  return ["<current_page>", ...lines, "</current_page>"].join("\n");
}
