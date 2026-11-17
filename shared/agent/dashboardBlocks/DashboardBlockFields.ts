import { cleanLlmGeneratedSql } from "$/utils/cleanLlmGeneratedSql/cleanLlmGeneratedSql.ts";
import type {
  ChatDashboardVizType,
  ChatGeneratedDashboardBlock,
} from "$/types/chat.types.ts";

/** Every block kind a model may add to a dashboard. */
export const DASHBOARD_BLOCK_KINDS = [
  "DataViz",
  "HeadingBlock",
  "ParagraphBlock",
  "QuoteBlock",
  "DividerBlock",
  "CalloutBlock",
  "ListBlock",
  "CodeBlock",
  "TableBlock",
  "Card",
] as const;

/** One dashboard block kind. */
export type DashboardBlockKind = (typeof DASHBOARD_BLOCK_KINDS)[number];

/** Every way a DataViz block can show its query. */
export const DASHBOARD_VIZ_TYPES = [
  "table",
  "bar",
  "line",
  "area",
  "scatter",
  "pie",
] as const satisfies readonly ChatDashboardVizType[];

const BLOCK_ALIGNS = ["left", "center", "right"] as const;
const HEADING_LEVELS = [1, 2, 3, 4] as const;
const CALLOUT_TONES = ["info", "warning", "neutral"] as const;
const LIST_TYPES = ["ordered", "unordered"] as const;
const TABLE_DELIMITERS = ["comma", "tab", "pipe"] as const;

/** A block's fields as a model sent them, before any check. */
type BlockFields = Readonly<Record<string, unknown>>;

/**
 * The result of checking a model's block: either a valid block, or the
 * reason the fields do not make one, written so it can be sent back to the
 * model.
 */
export type DashboardBlockParse =
  | { kind: "valid"; block: ChatGeneratedDashboardBlock }
  | { kind: "invalid"; reason: string };

function _text(value: unknown): string | undefined {
  const text = typeof value === "string" ? value.trim() : "";
  return text === "" ? undefined : text;
}

function _oneOf<Option extends string | number>(
  options: readonly Option[],
  value: unknown,
): Option | undefined {
  const candidate = typeof value === "string" ? value.trim() : value;
  return options.find((option) => {
    return option === candidate;
  });
}

function _valid(block: ChatGeneratedDashboardBlock): DashboardBlockParse {
  return { kind: "valid", block };
}

function _invalid(reason: string): DashboardBlockParse {
  return { kind: "invalid", reason };
}

function _parseDataViz(fields: BlockFields): DashboardBlockParse {
  const prompt = _text(fields.prompt);
  const rawSql = _text(fields.sql);
  if (!prompt || !rawSql) {
    return _invalid("DataViz needs prompt and sql.");
  }
  const vizType = _oneOf(DASHBOARD_VIZ_TYPES, fields.vizType);
  if (!vizType) {
    return _invalid(
      `DataViz vizType must be one of: ${DASHBOARD_VIZ_TYPES.join(", ")}.`,
    );
  }
  const sql = cleanLlmGeneratedSql(rawSql).trim();
  return sql === ""
    ? _invalid("DataViz sql is empty.")
    : _valid({ kind: "DataViz", prompt, sql, vizType });
}

function _parseHeading(fields: BlockFields): DashboardBlockParse {
  const text = _text(fields.text);
  if (!text) {
    return _invalid("HeadingBlock needs text.");
  }
  const level = _oneOf(HEADING_LEVELS, fields.level);
  const align = _oneOf(BLOCK_ALIGNS, fields.align);
  return _valid({
    kind: "HeadingBlock",
    text,
    ...(level ? { level } : {}),
    ...(align ? { align } : {}),
  });
}

function _parseParagraph(fields: BlockFields): DashboardBlockParse {
  const text = _text(fields.text);
  const align = _oneOf(BLOCK_ALIGNS, fields.align);
  return text
    ? _valid({ kind: "ParagraphBlock", text, ...(align ? { align } : {}) })
    : _invalid("ParagraphBlock needs text.");
}

function _parseQuote(fields: BlockFields): DashboardBlockParse {
  const quote = _text(fields.quote);
  const cite = _text(fields.cite);
  return quote
    ? _valid({ kind: "QuoteBlock", quote, ...(cite ? { cite } : {}) })
    : _invalid("QuoteBlock needs quote.");
}

function _parseCallout(fields: BlockFields): DashboardBlockParse {
  const title = _text(fields.title);
  const body = _text(fields.body);
  if (!title || !body) {
    return _invalid("CalloutBlock needs title and body.");
  }
  const tone = _oneOf(CALLOUT_TONES, fields.tone);
  return _valid({
    kind: "CalloutBlock",
    title,
    body,
    ...(tone ? { tone } : {}),
  });
}

function _parseList(fields: BlockFields): DashboardBlockParse {
  const items = (Array.isArray(fields.items) ? fields.items : []).flatMap(
    (item: unknown) => {
      const text = _text(item);
      return text ? [text] : [];
    },
  );
  if (items.length === 0) {
    return _invalid("ListBlock needs at least one item.");
  }
  const listType = _oneOf(LIST_TYPES, fields.listType);
  return _valid({
    kind: "ListBlock",
    items,
    ...(listType ? { listType } : {}),
  });
}

function _parseCode(fields: BlockFields): DashboardBlockParse {
  const code = _text(fields.code);
  const language = _text(fields.language);
  return code
    ? _valid({ kind: "CodeBlock", code, ...(language ? { language } : {}) })
    : _invalid("CodeBlock needs code.");
}

function _parseTable(fields: BlockFields): DashboardBlockParse {
  const data = _text(fields.data);
  if (!data) {
    return _invalid("TableBlock needs data.");
  }
  const delimiter = _oneOf(TABLE_DELIMITERS, fields.delimiter);
  const hasHeader =
    typeof fields.hasHeader === "boolean" ? fields.hasHeader : undefined;
  return _valid({
    kind: "TableBlock",
    data,
    ...(delimiter ? { delimiter } : {}),
    ...(hasHeader !== undefined ? { hasHeader } : {}),
  });
}

function _parseCard(fields: BlockFields): DashboardBlockParse {
  const title = _text(fields.title);
  return title
    ? _valid({ kind: "Card", title })
    : _invalid("Card needs title.");
}

const PARSERS: Readonly<
  Record<DashboardBlockKind, (fields: BlockFields) => DashboardBlockParse>
> = {
  DataViz: _parseDataViz,
  HeadingBlock: _parseHeading,
  ParagraphBlock: _parseParagraph,
  QuoteBlock: _parseQuote,
  DividerBlock: () => {
    return _valid({ kind: "DividerBlock" });
  },
  CalloutBlock: _parseCallout,
  ListBlock: _parseList,
  CodeBlock: _parseCode,
  TableBlock: _parseTable,
  Card: _parseCard,
};

/**
 * Checks a dashboard block's fields as a model sent them, keeping only
 * allowed optional values. A block with no `kind` but a `prompt` and `sql`
 * is a chart, as today's chat has always read it. An invalid block comes
 * back with a reason written for the model.
 *
 * Use it wherever a model's tool call adds a block to a dashboard, such as
 * the chat edge function or the browser agent.
 */
export function parseDashboardBlockFields(raw: unknown): DashboardBlockParse {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return _invalid("block must be an object.");
  }
  const fields = raw as BlockFields;
  const isUntypedChart =
    fields.kind === undefined &&
    typeof fields.sql === "string" &&
    typeof fields.prompt === "string";
  const kind =
    _oneOf(DASHBOARD_BLOCK_KINDS, fields.kind) ??
    (isUntypedChart ? "DataViz" : undefined);
  return kind
    ? PARSERS[kind](fields)
    : _invalid(`kind must be one of: ${DASHBOARD_BLOCK_KINDS.join(", ")}.`);
}

/** How to rewrite a block's SQL and the text it shows. */
type BlockTextMappers = Readonly<{
  mapSql: (sql: string) => string;
  mapText: (text: string) => string;
}>;

/**
 * A copy of the block with its SQL passed through `mapSql` and every string
 * it shows passed through `mapText`. Used to restore page placeholders on
 * the device before the block is shown or saved.
 */
export function mapDashboardBlockText(
  block: ChatGeneratedDashboardBlock,
  { mapSql, mapText }: BlockTextMappers,
): ChatGeneratedDashboardBlock {
  switch (block.kind) {
    case "DataViz":
      return {
        ...block,
        prompt: mapText(block.prompt),
        sql: mapSql(block.sql),
      };
    case "HeadingBlock":
    case "ParagraphBlock":
      return { ...block, text: mapText(block.text) };
    case "QuoteBlock":
      return {
        ...block,
        quote: mapText(block.quote),
        ...(block.cite ? { cite: mapText(block.cite) } : {}),
      };
    case "CalloutBlock":
      return {
        ...block,
        title: mapText(block.title),
        body: mapText(block.body),
      };
    case "ListBlock":
      return { ...block, items: block.items.map(mapText) };
    case "CodeBlock":
      return { ...block, code: mapText(block.code) };
    case "TableBlock":
      return { ...block, data: mapText(block.data) };
    case "Card":
      return { ...block, title: mapText(block.title) };
    case "DividerBlock":
      return block;
  }
}
