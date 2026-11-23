import {
  formatBlockSql,
  formatHiddenChartsLine,
  formatTileLine,
  inlineBlockText,
  quoteBlockText,
  redactBlockSql,
} from "$/agent/pageContext/agentBlockText.ts";
import { MAX_PAGE_TILES } from "$/agent/pageContext/AgentPageContext.ts";
import type { BlockRenderOptions } from "$/agent/pageContext/agentBlockText.ts";
import type {
  AgentPageApp,
  AgentPageContext,
} from "$/agent/pageContext/AgentPageContext.ts";
import type { SqlTableAlias } from "$/models/chat/SqlTableAlias/SqlTableAlias.ts";

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

/** True when a piece of page text looks like personal data. */
type IsSensitive = (text: string) => boolean;

/** Page text with personal values hidden, before it leaves the device. */
type HideText = (text: string) => string;

/** A dashboard whose tiles are the listed ones, with the rest counted. */
type ListedDashboard = NonNullable<AgentPageContext["dashboard"]> & {
  hiddenTileCount?: number;
};

/** The page with its SQL redacted and only the listed charts kept. */
export type RedactedPageContext = Omit<AgentPageContext, "dashboard"> & {
  dashboard?: ListedDashboard;
};

/**
 * The context with its page SQL (the explorer's query and every chart's,
 * including charts past the listing cap, which are then dropped) stripped
 * of comments and passed through `redactSql`. The first
 * half of `buildAgentPageContextBlock`, exported so the page block can be
 * built in one redaction pass with the attached and mentioned blocks.
 */
export function redactAgentPageContext(
  context: AgentPageContext,
  redactSql: HideText | undefined,
): RedactedPageContext {
  const redact = (sql: string): string => {
    return redactBlockSql(sql, redactSql);
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
            // Every chart is redacted, so a value only a chart past the
            // listing cap filters on is still masked in names and titles.
            tiles: dashboard.tiles
              .map((tile) => {
                return { ...tile, sql: redact(tile.sql) };
              })
              .slice(0, MAX_PAGE_TILES),
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
 * The open dataset's line. The name comes first and the alias follows as a
 * note for SQL, so the model reads the name as what to call the dataset.
 */
function _datasetLine(
  dataset: NonNullable<AgentPageContext["dataset"]>,
  options: BlockRenderOptions,
): string {
  const entry = options.aliases.find((candidate) => {
    return candidate.kind === "dataset" && candidate.datasetId === dataset.id;
  });
  const name = quoteBlockText(options.mask(dataset.name));
  return entry
    ? `Open dataset: ${name} (query it as ${entry.alias})`
    : `Open dataset: ${name}`;
}

function _explorerLines(
  explorer: NonNullable<AgentPageContext["explorer"]>,
  options: BlockRenderOptions,
): string[] {
  const columns = explorer.resultColumns.map((column) => {
    return `${inlineBlockText(options.mask(column.name))} ${inlineBlockText(column.dataType)}`;
  });
  return [
    ...(explorer.sql
      ? [`Query on screen: ${formatBlockSql(explorer.sql, options.aliases)}`]
      : []),
    ...(columns.length > 0 ? [`Result columns: ${columns.join(", ")}`] : []),
  ];
}

function _dashboardLines(
  dashboard: ListedDashboard,
  options: BlockRenderOptions,
): string[] {
  const listed = dashboard.tiles;
  const hiddenCount = dashboard.hiddenTileCount ?? 0;
  return [
    `Dashboard: ${quoteBlockText(options.mask(dashboard.name))}`,
    ...(listed.length > 0 ? ["Charts on this dashboard:"] : []),
    ...listed.map((tile, index) => {
      return formatTileLine(tile, index, options);
    }),
    ...(hiddenCount > 0 ? [formatHiddenChartsLine(hiddenCount)] : []),
  ];
}

function _caseLines(
  context: RedactedPageContext,
  options: BlockRenderOptions,
): string[] {
  return [
    ...(context.caseType
      ? [`Case type: ${quoteBlockText(options.mask(context.caseType.name))}`]
      : []),
    ...(context.app === "case"
      ? ["One case is open; its details are not shared."]
      : []),
  ];
}

/** Renders a redacted page context as the `<current_page>` block. */
export function renderAgentPageContextBlock(
  context: RedactedPageContext,
  render: BlockRenderOptions,
): string {
  const lines = [
    `Page: ${APP_LABELS[context.app]}`,
    ...(context.dataset ? [_datasetLine(context.dataset, render)] : []),
    ...(context.explorer ? _explorerLines(context.explorer, render) : []),
    ...(context.dashboard ? _dashboardLines(context.dashboard, render) : []),
    ...(context.map
      ? [`Map: ${quoteBlockText(render.mask(context.map.name))}`]
      : []),
    ..._caseLines(context, render),
  ];
  return ["<current_page>", ...lines, "</current_page>"].join("\n");
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
 * become "Untitled chart". Built from `redactAgentPageContext` and
 * `renderAgentPageContextBlock`.
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
  const context = redactAgentPageContext(options.context, options.redactSql);
  return renderAgentPageContextBlock(context, {
    aliases: options.aliases,
    isSensitive: options.isSensitive,
    mask:
      options.maskText ??
      ((text) => {
        return text;
      }),
  });
}
