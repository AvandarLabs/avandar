import {
  MAX_PAGE_SQL_CHARACTERS,
  MAX_PAGE_TILES,
} from "$/agent/pageContext/AgentPageContext.ts";
import { SqlLiterals } from "$/agent/pageContext/SqlLiterals.ts";
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

/**
 * A `<` that does not start a page placeholder (`<value 3>`). A placeholder
 * cannot spell out a page tag, so it is left readable in names.
 */
const NON_PLACEHOLDER_LT = /<(?!value [1-9]\d*>)/g;

/** A chart's title in the block when its own looks like personal data. */
const REDACTED_TILE_TITLE = "Untitled chart";

type Aliases = readonly SqlTableAlias.T[];

/** True when a piece of page text looks like personal data. */
type IsSensitive = (text: string) => boolean;

/** Page text with personal values hidden, before it leaves the device. */
type HideText = (text: string) => string;

/** A dashboard whose tiles are the listed ones, with the rest counted. */
type ListedDashboard = NonNullable<AgentPageContext["dashboard"]> & {
  hiddenTileCount?: number;
};

/** The page with its SQL redacted and only the listed charts kept. */
type RedactedPageContext = Omit<AgentPageContext, "dashboard"> & {
  dashboard?: ListedDashboard;
};

/** What rendering needs once every piece of page SQL is redacted. */
type RenderOptions = Readonly<{
  aliases: Aliases;
  isSensitive?: IsSensitive;
  mask: HideText;
}>;

/**
 * A name as a JSON string literal, so quotes and line breaks are escaped,
 * including the line and paragraph separators JSON leaves raw. Every `<`
 * but a placeholder's becomes `\u003c`, so a name can never spell out
 * `</current_page>`.
 */
function _quote(name: string): string {
  return JSON.stringify(name)
    .replace(NON_PLACEHOLDER_LT, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

/**
 * Text that is not quoted (column names, types, chart types) kept on one
 * line: line breaks become spaces and every `<` but a placeholder's becomes
 * `\u003c`, so it can neither start a new line nor spell out
 * `</current_page>`.
 */
function _inline(text: string): string {
  return text.replace(LINE_BREAKS, " ").replace(NON_PLACEHOLDER_LT, "\\u003c");
}

/**
 * The context with its page SQL (the explorer's query and each listed
 * chart's) stripped of comments and passed through `redactSql`. Comments go
 * first: they can hold values, and once the SQL is on one line a `--`
 * comment would swallow the rest of the statement.
 */
function _redactContextSql(
  context: AgentPageContext,
  redactSql: HideText | undefined,
): RedactedPageContext {
  const redact = (sql: string): string => {
    const stripped = SqlLiterals.stripComments(sql);
    return redactSql ? redactSql(stripped) : stripped;
  };
  const { explorer, dashboard } = context;
  return {
    ...context,
    ...(explorer?.sql
      ? { explorer: { ...explorer, sql: redact(explorer.sql) } }
      : {}),
    ...(dashboard
      ? {
          dashboard: {
            ...dashboard,
            tiles: dashboard.tiles.slice(0, MAX_PAGE_TILES).map((tile) => {
              return { ...tile, sql: redact(tile.sql) };
            }),
            hiddenTileCount: Math.max(
              dashboard.tiles.length - MAX_PAGE_TILES,
              0,
            ),
          },
        }
      : {}),
  };
}

/**
 * One redacted SQL statement on a single line, with table names shown as
 * aliases, and cut at the cap. It is never masked: masking words would
 * break identifiers, and redaction already hid the literals the vault
 * holds. Only a `<` that would start a page tag is escaped, so comparisons
 * such as `a < b` stay readable.
 */
function _formatSql(sql: string, options: RenderOptions): string {
  const singleLine = sql.trim().replace(LINE_BREAKS, " ");
  const aliased = SqlTableAlias.toAliasedSql(
    singleLine,
    options.aliases,
  ).replace(PAGE_TAG_START, "\\u003c");
  return aliased.length > MAX_PAGE_SQL_CHARACTERS
    ? `${aliased.slice(0, MAX_PAGE_SQL_CHARACTERS)} ...`
    : aliased;
}

/**
 * The open dataset's line. The name comes first and the alias follows as a
 * note for SQL, so the model reads the name as what to call the dataset.
 */
function _datasetLine(
  dataset: NonNullable<AgentPageContext["dataset"]>,
  options: RenderOptions,
): string {
  const entry = options.aliases.find((candidate) => {
    return candidate.kind === "dataset" && candidate.datasetId === dataset.id;
  });
  const name = _quote(options.mask(dataset.name));
  return entry
    ? `Open dataset: ${name} (query it as ${entry.alias})`
    : `Open dataset: ${name}`;
}

function _explorerLines(
  explorer: NonNullable<AgentPageContext["explorer"]>,
  options: RenderOptions,
): string[] {
  const columns = explorer.resultColumns.map((column) => {
    return `${_inline(options.mask(column.name))} ${_inline(column.dataType)}`;
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
 * data becomes "Untitled chart"; any other title is masked.
 */
function _tileLine(
  tile: AgentPageTile,
  index: number,
  options: RenderOptions,
): string {
  const { isSensitive } = options;
  const title =
    isSensitive && isSensitive(tile.title)
      ? REDACTED_TILE_TITLE
      : options.mask(tile.title);
  const sql = _formatSql(tile.sql, options);
  const heading = `${index + 1}. ${_quote(title)} (${_inline(tile.chartType)})`;
  return sql === "" ? heading : `${heading}: ${sql}`;
}

function _dashboardLines(
  dashboard: ListedDashboard,
  options: RenderOptions,
): string[] {
  const listed = dashboard.tiles;
  const hiddenCount = dashboard.hiddenTileCount ?? 0;
  return [
    `Dashboard: ${_quote(options.mask(dashboard.name))}`,
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

function _caseLines(
  context: RedactedPageContext,
  options: RenderOptions,
): string[] {
  return [
    ...(context.caseType
      ? [`Case type: ${_quote(options.mask(context.caseType.name))}`]
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
 * swapping them for placeholders the browser maps back. Comments are
 * dropped from page SQL first. `maskText` then hides values that SQL
 * revealed wherever else they appear: names, chart titles, and result
 * columns, never the SQL. Every piece of SQL is redacted before anything is
 * masked, so a value one chart filters on is hidden in every title.
 * `isSensitive` flags chart titles that look like personal data, which
 * become "Untitled chart".
 */
export function buildAgentPageContextBlock(
  options: Readonly<{
    context: AgentPageContext;
    aliases: Aliases;
    isSensitive?: IsSensitive;
    redactSql?: HideText;
    maskText?: HideText;
  }>,
): string {
  const context = _redactContextSql(options.context, options.redactSql);
  const render: RenderOptions = {
    aliases: options.aliases,
    isSensitive: options.isSensitive,
    mask:
      options.maskText ??
      ((text) => {
        return text;
      }),
  };
  const lines = [
    `Page: ${APP_LABELS[context.app]}`,
    ...(context.dataset ? [_datasetLine(context.dataset, render)] : []),
    ...(context.explorer ? _explorerLines(context.explorer, render) : []),
    ...(context.dashboard ? _dashboardLines(context.dashboard, render) : []),
    ...(context.map ? [`Map: ${_quote(render.mask(context.map.name))}`] : []),
    ..._caseLines(context, render),
  ];
  return ["<current_page>", ...lines, "</current_page>"].join("\n");
}
