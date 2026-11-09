import { MAX_PAGE_SQL_CHARACTERS } from "$/agent/pageContext/AgentPageContext.ts";
import { SqlLiterals } from "$/agent/pageContext/SqlLiterals.ts";
import { SqlTableAlias } from "$/models/chat/SqlTableAlias/SqlTableAlias.ts";
import type { AgentPageTile } from "$/agent/pageContext/AgentPageContext.ts";

/**
 * A run of line breaks (CR, LF, vertical tab, form feed, next line, line
 * and paragraph separators) and spaces.
 */
const LINE_BREAKS = /\s*[\r\n\v\f\u0085\u2028\u2029]+\s*/g;

/**
 * A `<` that would start an agent block tag (`current_page`, `attached`,
 * `mentioned`), opening or closing, including spellings with spaces such
 * as `< /attached>` or with zero-width characters between `<` and the name.
 */
const BLOCK_TAG_START =
  /<(?=[\s\u200b-\u200d\u2060\ufeff]*\/?[\s\u200b-\u200d\u2060\ufeff]*(?:current_page|attached|mentioned))/gi;

/**
 * A `<` that does not start a page placeholder (`<value 3>`). A placeholder
 * cannot spell out a block tag, so it is left readable in names.
 */
const NON_PLACEHOLDER_LT = /<(?!value [1-9]\d*>)/g;

/** A chart's title in a block when its own looks like personal data. */
export const REDACTED_TILE_TITLE = "Untitled chart";

/** What rendering a block needs once every piece of its SQL is redacted. */
export type BlockRenderOptions = Readonly<{
  aliases: readonly SqlTableAlias.T[];
  /** True when a chart title looks like personal data. */
  isSensitive?: (text: string) => boolean;
  /** Hides values that page SQL revealed, in names and titles. */
  mask: (text: string) => string;
}>;

/**
 * A name as a JSON string literal, so quotes and line breaks are escaped,
 * including the next line, line and paragraph separators JSON leaves raw.
 * Every `<`
 * but a placeholder's becomes `\u003c`, so a name can never spell out a
 * block tag.
 */
export function quoteBlockText(name: string): string {
  return JSON.stringify(name)
    .replace(NON_PLACEHOLDER_LT, "\\u003c")
    .replace(/\u0085/g, "\\u0085")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

/**
 * Text that is not quoted (column names, types, chart types) kept on one
 * line: line breaks become spaces and every `<` but a placeholder's becomes
 * `\u003c`, so it can neither start a new line nor spell out a block tag.
 */
export function inlineBlockText(text: string): string {
  return text.replace(LINE_BREAKS, " ").replace(NON_PLACEHOLDER_LT, "\\u003c");
}

/**
 * SQL with its comments stripped, then passed through `redactSql`.
 * Comments go first: they can hold values, and once the SQL is on one line
 * a `--` comment would swallow the rest of the statement.
 */
export function redactBlockSql(
  sql: string,
  redactSql: ((sql: string) => string) | undefined,
): string {
  const stripped = SqlLiterals.stripComments(sql);
  return redactSql ? redactSql(stripped) : stripped;
}

/**
 * One redacted SQL statement on a single line, with table names shown as
 * aliases, and cut at the cap. It is never masked: masking words would
 * break identifiers, and redaction already hid the literals the vault
 * holds. Only a `<` that would start a block tag is escaped, so comparisons
 * such as `a < b` stay readable.
 */
export function formatBlockSql(
  sql: string,
  aliases: readonly SqlTableAlias.T[],
): string {
  const singleLine = sql.trim().replace(LINE_BREAKS, " ");
  const aliased = SqlTableAlias.toAliasedSql(singleLine, aliases).replace(
    BLOCK_TAG_START,
    "\\u003c",
  );
  return aliased.length > MAX_PAGE_SQL_CHARACTERS
    ? `${aliased.slice(0, MAX_PAGE_SQL_CHARACTERS)} ...`
    : aliased;
}

/** A chart's title as a block shows it: hidden when it looks personal. */
export function formatTileTitle(
  title: string,
  options: BlockRenderOptions,
): string {
  const { isSensitive } = options;
  return isSensitive && isSensitive(title)
    ? REDACTED_TILE_TITLE
    : options.mask(title);
}

/**
 * The line that counts a dashboard's charts past the listing cap, so the
 * model knows the list is partial. Shared by the page, attached, and
 * mentioned blocks.
 */
export function formatHiddenChartsLine(count: number): string {
  return `${count} more ${count === 1 ? "chart" : "charts"} not listed.`;
}

/**
 * One chart's line: its number, quoted title, chart type, and SQL. A tile
 * whose SQL is empty, or left out by a cap, shows its heading only.
 */
export function formatTileLine(
  tile: AgentPageTile,
  index: number,
  options: BlockRenderOptions,
): string {
  const title = quoteBlockText(formatTileTitle(tile.title, options));
  const heading = `${index + 1}. ${title} (${inlineBlockText(tile.chartType)})`;
  const sql = tile.sql === "" ? "" : formatBlockSql(tile.sql, options.aliases);
  return sql === "" ? heading : `${heading}: ${sql}`;
}
