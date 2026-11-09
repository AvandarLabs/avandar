import {
  getAgentGadgetName,
  getUnavailableGadgetName,
  MAX_ATTACHED_GADGETS,
  MAX_CASE_TYPE_FIELDS,
  MAX_DESCRIBED_MENTIONS,
  MAX_GADGET_BLOCK_TILES,
} from "$/agent/mentions/AgentGadgetContext.ts";
import { ChatMentionToken } from "$/agent/mentions/ChatMentionToken.ts";
import {
  formatBlockSql,
  formatHiddenChartsLine,
  formatTileLine,
  formatTileTitle,
  inlineBlockText,
  quoteBlockText,
  redactBlockSql,
} from "$/agent/pageContext/agentBlockText.ts";
import { MAX_PAGE_TILES } from "$/agent/pageContext/AgentPageContext.ts";
import {
  redactAgentPageContext,
  renderAgentPageContextBlock,
} from "$/agent/pageContext/buildAgentPageContextBlock.ts";
import type { AgentGadgetContext } from "$/agent/mentions/AgentGadgetContext.ts";
import type { BlockRenderOptions } from "$/agent/pageContext/agentBlockText.ts";
import type { AgentPageContext } from "$/agent/pageContext/AgentPageContext.ts";
import type { RedactedPageContext } from "$/agent/pageContext/buildAgentPageContextBlock.ts";
import type { SqlTableAlias } from "$/models/chat/SqlTableAlias/SqlTableAlias.ts";

/**
 * The blocks that start an agent turn, each left out when empty. Built by
 * `buildAgentContextBlocks` and joined into the turn's text by
 * `buildAgentTurnText`.
 */
export type AgentContextBlocks = {
  pageBlock?: string;
  attachedBlock?: string;
  mentionedBlock?: string;
};

type HideText = (text: string) => string;

/** The inputs of one turn's blocks. */
type ContextBlockOptions = {
  page?: AgentPageContext;
  attached: readonly AgentGadgetContext[];
  mentioned: readonly AgentGadgetContext[];
  aliases: readonly SqlTableAlias.T[];
  isSensitive?: (text: string) => boolean;
  redactSql?: HideText;
  maskText?: HideText;
};

/**
 * A gadget with only the charts a block lists. A chart left out by the
 * tile budget has empty SQL; charts past 12 on a dashboard are counted.
 */
type ListedGadget = AgentGadgetContext & { hiddenTileCount?: number };

/** Why a mention is one short line instead of a description. */
type MentionPointer = "attached" | "page" | "not_described";

/** A mention as it will be drawn in the mentioned block. */
type PlannedMention =
  | { kind: "described"; context: ListedGadget }
  | { kind: "pointer"; context: AgentGadgetContext; pointer: MentionPointer };

/** What each block holds before rendering. */
type PlannedBlocks = {
  page?: RedactedPageContext;
  attached: readonly ListedGadget[];
  mentioned: readonly PlannedMention[];
};

/** The turn's gadgets and page with every piece of their SQL redacted. */
type RedactedInputs = {
  page?: RedactedPageContext;
  attached: readonly AgentGadgetContext[];
  mentioned: readonly AgentGadgetContext[];
};

type BudgetedItem<Item> = { item: Item; sqlTileCount: number };

/**
 * A gadget cut to the charts a block lists: 12 per dashboard, and the
 * first `remaining` of those keep their SQL. The rest keep their titles.
 */
function _listTiles(
  context: AgentGadgetContext,
  remaining: number,
): BudgetedItem<ListedGadget> {
  if (context.kind === "dashboard_tile") {
    if (context.tile.sql === "") {
      return { item: context, sqlTileCount: 0 };
    }
    const hasSql = remaining > 0;
    return {
      item: hasSql
        ? context
        : { ...context, tile: { ...context.tile, sql: "" } },
      sqlTileCount: hasSql ? 1 : 0,
    };
  }
  if (context.kind !== "dashboard") {
    return { item: context, sqlTileCount: 0 };
  }
  const listed = context.tiles.slice(0, MAX_PAGE_TILES);
  const sqlTileCount = Math.min(listed.length, Math.max(remaining, 0));
  return {
    item: {
      ...context,
      tiles: listed.map((tile, index) => {
        return index < sqlTileCount ? tile : { ...tile, sql: "" };
      }),
      hiddenTileCount: Math.max(context.tiles.length - MAX_PAGE_TILES, 0),
    },
    sqlTileCount,
  };
}

/** Lists each item's charts in order, spending one shared tile budget. */
function _spendTileBudget<Item, Listed>(
  items: readonly Item[],
  remaining: number,
  list: (item: Item, remaining: number) => BudgetedItem<Listed>,
): { items: Listed[]; remaining: number } {
  return items.reduce<{ items: Listed[]; remaining: number }>(
    (spent, item) => {
      const budgeted = list(item, spent.remaining);
      return {
        items: [...spent.items, budgeted.item],
        remaining: spent.remaining - budgeted.sqlTileCount,
      };
    },
    { items: [], remaining },
  );
}

/**
 * Each mention as a description or a pointer: to the tray when it is
 * attached, to the page when it is the page's dashboard, and "not
 * described" once five mentions are described. Pointers to the tray or the
 * page do not count toward the five.
 */
function _planMentions(
  mentioned: readonly AgentGadgetContext[],
  attached: readonly AgentGadgetContext[],
  page: RedactedPageContext | undefined,
): PlannedMention[] {
  const attachedKeys = new Set(
    attached.map((context) => {
      return ChatMentionToken.buildRefKey(context.ref);
    }),
  );
  const planned = mentioned.map((context): PlannedMention => {
    if (attachedKeys.has(ChatMentionToken.buildRefKey(context.ref))) {
      return { kind: "pointer", context, pointer: "attached" };
    }
    return context.kind === "dashboard" &&
      page?.dashboard?.id === context.ref.gadgetId
      ? { kind: "pointer", context, pointer: "page" }
      : { kind: "described", context };
  });
  // Only described mentions spend the cap; the sixth becomes a pointer.
  return planned.reduce<{ items: PlannedMention[]; describedCount: number }>(
    (counted, item) => {
      if (item.kind === "pointer") {
        return { ...counted, items: [...counted.items, item] };
      }
      const isDescribed = counted.describedCount < MAX_DESCRIBED_MENTIONS;
      return {
        items: [
          ...counted.items,
          isDescribed
            ? item
            : {
                kind: "pointer",
                context: item.context,
                pointer: "not_described",
              },
        ],
        describedCount: counted.describedCount + (isDescribed ? 1 : 0),
      };
    },
    { items: [], describedCount: 0 },
  ).items;
}

/**
 * The turn's redacted gadgets cut to the caps: 5 described mentions and 24
 * charts with SQL across the attached and described mentions. A cap only
 * empties SQL that was already redacted, so the vault holds its values.
 */
function _planBlocks(inputs: Readonly<RedactedInputs>): PlannedBlocks {
  const attached = _spendTileBudget(
    inputs.attached,
    MAX_GADGET_BLOCK_TILES,
    _listTiles,
  );
  const mentioned = _spendTileBudget(
    _planMentions(inputs.mentioned, attached.items, inputs.page),
    attached.remaining,
    (item, remaining): BudgetedItem<PlannedMention> => {
      if (item.kind === "pointer") {
        return { item, sqlTileCount: 0 };
      }
      const listed = _listTiles(item.context, remaining);
      return { ...listed, item: { ...item, context: listed.item } };
    },
  );
  return {
    page: inputs.page,
    attached: attached.items,
    mentioned: mentioned.items,
  };
}

/** The gadget with every chart's SQL redacted. Empty SQL is skipped. */
function _redactGadgetSql(
  context: AgentGadgetContext,
  redactSql: HideText | undefined,
): AgentGadgetContext {
  const redact = (sql: string): string => {
    return sql === "" ? "" : redactBlockSql(sql, redactSql);
  };
  if (context.kind === "dashboard") {
    return {
      ...context,
      tiles: context.tiles.map((tile) => {
        return { ...tile, sql: redact(tile.sql) };
      }),
    };
  }
  return context.kind === "dashboard_tile"
    ? { ...context, tile: { ...context.tile, sql: redact(context.tile.sql) } }
    : context;
}

/**
 * Every piece of SQL of every gadget whose name or title the blocks may
 * send, redacted: the page's charts past 12, every attached and mentioned
 * gadget's charts, and the SQL of mentions that become pointers or charts a
 * cap leaves out. A value only that SQL filters on is then masked in the
 * gadget's name, even though the SQL itself is never sent. Attached
 * gadgets past the tray's 5 are dropped here, since nothing of them is
 * sent.
 */
function _redactInputs(options: Readonly<ContextBlockOptions>): RedactedInputs {
  const redact = (context: AgentGadgetContext): AgentGadgetContext => {
    return _redactGadgetSql(context, options.redactSql);
  };
  return {
    page: options.page
      ? redactAgentPageContext(options.page, options.redactSql)
      : undefined,
    attached: options.attached.slice(0, MAX_ATTACHED_GADGETS).map(redact),
    mentioned: options.mentioned.map(redact),
  };
}

function _quoted(text: string, render: BlockRenderOptions): string {
  return quoteBlockText(render.mask(text));
}

function _datasetText(
  context: Extract<AgentGadgetContext, { kind: "dataset" }>,
  render: BlockRenderOptions,
): string {
  const entry = render.aliases.find((candidate) => {
    return (
      candidate.kind === "dataset" &&
      candidate.datasetId === context.ref.gadgetId
    );
  });
  const name = _quoted(context.name, render);
  return entry
    ? `Dataset ${name} (query it as ${entry.alias})`
    : `Dataset ${name}, not queryable in this chat`;
}

function _mapText(
  context: Extract<AgentGadgetContext, { kind: "map" }>,
  render: BlockRenderOptions,
): string {
  const layers = context.layers.map((layer) => {
    const source = layer.sourceName
      ? ` from ${_quoted(layer.sourceName, render)}`
      : "";
    return `${_quoted(layer.name, render)}${source}`;
  });
  const name = `Map ${_quoted(context.name, render)}`;
  return layers.length > 0 ? `${name}, layers: ${layers.join("; ")}` : name;
}

function _conceptText(
  context: Extract<AgentGadgetContext, { kind: "concept" }>,
  render: BlockRenderOptions,
): string {
  const listed = context.fieldNames.slice(0, MAX_CASE_TYPE_FIELDS);
  const hiddenCount = context.fieldNames.length - listed.length;
  const fields = listed.map((field) => {
    return _quoted(field, render);
  });
  const more = hiddenCount > 0 ? `, and ${hiddenCount} more` : "";
  const name = `Case type ${_quoted(context.name, render)}`;
  return fields.length > 0
    ? `${name}, fields: ${fields.join(", ")}${more}`
    : name;
}

function _dashboardLines(
  context: Extract<ListedGadget, { kind: "dashboard" }>,
  render: BlockRenderOptions,
): string[] {
  const hiddenCount = context.hiddenTileCount ?? 0;
  const nested = [
    ...(context.tiles.length > 0 ? ["Charts on this dashboard:"] : []),
    ...context.tiles.map((tile, index) => {
      return formatTileLine(tile, index, render);
    }),
    ...(hiddenCount > 0 ? [formatHiddenChartsLine(hiddenCount)] : []),
  ];
  return [
    `Dashboard ${_quoted(context.name, render)}`,
    ...nested.map((line) => {
      return `   ${line}`;
    }),
  ];
}

function _tileText(
  context: Extract<AgentGadgetContext, { kind: "dashboard_tile" }>,
  render: BlockRenderOptions,
): string {
  const { tile } = context;
  const title = quoteBlockText(formatTileTitle(tile.title, render));
  const dashboardName = _quoted(context.dashboardName, render);
  const chartType = inlineBlockText(tile.chartType);
  const heading = `Chart ${title} on dashboard ${dashboardName} (${chartType})`;
  return tile.sql === ""
    ? heading
    : `${heading}: ${formatBlockSql(tile.sql, render.aliases)}`;
}

/** A gadget's description: its first line, then any nested lines. */
function _describe(
  context: ListedGadget,
  render: BlockRenderOptions,
): string[] {
  switch (context.kind) {
    case "dashboard":
      return _dashboardLines(context, render);
    case "dashboard_tile":
      return [_tileText(context, render)];
    case "dataset":
      return [_datasetText(context, render)];
    case "map":
      return [_mapText(context, render)];
    case "concept":
      return [_conceptText(context, render)];
    case "unavailable": {
      const name = getAgentGadgetName(context);
      return [`${name[0]?.toUpperCase()}${name.slice(1)}. You cannot see it.`];
    }
  }
}

/**
 * How the agent's model hears a gadget's name, in the blocks and in the
 * message's `@"Name"`: a tile title that looks personal becomes "Untitled
 * chart", an unavailable gadget keeps its fixed type phrase, and every
 * other name is masked with the conversation's vault. Call it only after
 * every piece of SQL in the turn is redacted, for example once
 * `buildAgentContextBlocks` has built the turn's blocks.
 */
export function buildAgentGadgetModelName(
  context: AgentGadgetContext,
  options: Readonly<{
    isSensitive?: (text: string) => boolean;
    mask: HideText;
  }>,
): string {
  switch (context.kind) {
    case "dashboard_tile":
      return formatTileTitle(context.tile.title, { aliases: [], ...options });
    case "unavailable":
      // Fixed model-facing text, never masked, so the `@` name matches the
      // entry's description.
      return getUnavailableGadgetName(context.ref);
    default:
      return options.mask(getAgentGadgetName(context));
  }
}

function _attachedBlock(
  attached: readonly ListedGadget[],
  render: BlockRenderOptions,
): string | undefined {
  if (attached.length === 0) {
    return undefined;
  }
  const lines = attached.flatMap((context, index) => {
    const [first = "", ...nested] = _describe(context, render);
    return [`${index + 1}. ${first}`, ...nested];
  });
  return [
    "<attached>",
    "Pinned by the user for this whole chat:",
    ...lines,
    "</attached>",
  ].join("\n");
}

/** A pointer's text, with any name masked here, after every redaction. */
function _pointerText(
  item: Extract<PlannedMention, { kind: "pointer" }>,
  render: BlockRenderOptions,
): string {
  switch (item.pointer) {
    case "attached":
      return "attached above";
    case "not_described":
      return "mentioned, not described";
    case "page": {
      const name = _quoted(getAgentGadgetName(item.context), render);
      return `Dashboard ${name}, the dashboard on the current page`;
    }
  }
}

function _mentionedBlock(
  planned: readonly PlannedMention[],
  render: BlockRenderOptions,
): string | undefined {
  if (planned.length === 0) {
    return undefined;
  }
  const lines = planned.flatMap((item) => {
    const modelName = buildAgentGadgetModelName(item.context, render);
    const name = `@${quoteBlockText(modelName)}`;
    if (item.kind === "pointer") {
      return [`${name}: ${_pointerText(item, render)}`];
    }
    const [first = "", ...nested] = _describe(item.context, render);
    return [`${name}: ${first}`, ...nested];
  });
  return [
    "<mentioned>",
    "What each @ in the message refers to:",
    ...lines,
    "</mentioned>",
  ].join("\n");
}

function _withoutUndefined(blocks: AgentContextBlocks): AgentContextBlocks {
  return Object.fromEntries(
    Object.entries(blocks).filter(([, block]) => {
      return block !== undefined;
    }),
  );
}

/**
 * The blocks that start an agent turn: the current page, the gadgets the
 * user attached to the chat, and what this message's `@` mentions refer
 * to. Every piece of SQL in all three is redacted with `redactSql` before
 * any name, title, or column is masked with `maskText`, so a value one
 * chart filters on is hidden in every title, wherever that title appears.
 * SQL a cap leaves out is redacted too but never sent, so a value only that
 * SQL filters on is still hidden in its gadget's name and titles.
 */
export function buildAgentContextBlocks(
  options: Readonly<ContextBlockOptions>,
): AgentContextBlocks {
  // Caps: 5 attached, 5 described mentions, 12 charts per dashboard, and 24
  // charts with SQL across the attached and described mentions. A mention
  // of the page's dashboard or of an attached gadget is one pointer line
  // and does not count toward the 5 described mentions.
  // Every redaction happens here, before anything below masks a name.
  const redacted = _planBlocks(_redactInputs(options));
  const render: BlockRenderOptions = {
    aliases: options.aliases,
    isSensitive: options.isSensitive,
    mask:
      options.maskText ??
      ((text) => {
        return text;
      }),
  };
  return _withoutUndefined({
    pageBlock: redacted.page
      ? renderAgentPageContextBlock(redacted.page, render)
      : undefined,
    attachedBlock: _attachedBlock(redacted.attached, render),
    mentionedBlock: _mentionedBlock(redacted.mentioned, render),
  });
}
