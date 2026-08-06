import { cleanLlmGeneratedSql } from "@sbfn/chat/utils/cleanLlmGeneratedSql/cleanLlmGeneratedSql.ts";
import { match } from "ts-pattern";
import type {
  ChatDashboardVizType,
  ChatGeneratedDashboardBlock,
} from "$/types/chat.types.ts";

const ALLOWED_DASHBOARD_VIZ_TYPES = new Set<ChatDashboardVizType>([
  "table",
  "bar",
  "line",
  "area",
  "scatter",
  "pie",
]);
const ALLOWED_DASHBOARD_BLOCK_KINDS = new Set([
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
]);
const ALLOWED_BLOCK_ALIGN = new Set(["left", "center", "right"]);
const ALLOWED_HEADING_LEVELS = new Set([1, 2, 3, 4]);
const ALLOWED_CALLOUT_TONES = new Set(["info", "warning", "neutral"]);
const ALLOWED_LIST_TYPES = new Set(["ordered", "unordered"]);
const ALLOWED_TABLE_DELIMITERS = new Set(["comma", "tab", "pipe"]);

type RawDashboardBlockArgs = {
  kind?: unknown;
  prompt?: unknown;
  sql?: unknown;
  vizType?: unknown;
  text?: unknown;
  level?: unknown;
  align?: unknown;
  quote?: unknown;
  cite?: unknown;
  title?: unknown;
  body?: unknown;
  tone?: unknown;
  items?: unknown;
  listType?: unknown;
  code?: unknown;
  language?: unknown;
  data?: unknown;
  delimiter?: unknown;
  hasHeader?: unknown;
};

function _trimString(value: unknown): string | undefined {
  return typeof value === "string" ? value.trim() : undefined;
}

/** Parses and bounds an addDashboardBlock tool call. */
export function parseDashboardBlock(
  argsJson: string | undefined,
): ChatGeneratedDashboardBlock | undefined {
  if (!argsJson) {
    return undefined;
  }
  let parsed: RawDashboardBlockArgs;
  try {
    parsed = JSON.parse(argsJson) as RawDashboardBlockArgs;
  } catch {
    return undefined;
  }

  let kind = typeof parsed.kind === "string" ? parsed.kind.trim() : undefined;
  if (
    kind === undefined &&
    typeof parsed.sql === "string" &&
    typeof parsed.prompt === "string"
  ) {
    kind = "DataViz";
  }
  if (kind === undefined || !ALLOWED_DASHBOARD_BLOCK_KINDS.has(kind)) {
    return undefined;
  }

  return match(kind)
    .with("DataViz", (): ChatGeneratedDashboardBlock | undefined => {
      const prompt = _trimString(parsed.prompt);
      const sqlRaw = _trimString(parsed.sql);
      const vizTypeRaw = _trimString(parsed.vizType);
      if (!prompt || !sqlRaw || !vizTypeRaw) {
        return undefined;
      }
      const sql = cleanLlmGeneratedSql(sqlRaw).trim();
      const vizType = vizTypeRaw as ChatDashboardVizType;
      if (sql.length === 0 || !ALLOWED_DASHBOARD_VIZ_TYPES.has(vizType)) {
        return undefined;
      }
      return { kind: "DataViz", prompt, sql, vizType };
    })
    .with("HeadingBlock", (): ChatGeneratedDashboardBlock | undefined => {
      const text = _trimString(parsed.text);
      if (!text) {
        return undefined;
      }
      const level =
        (
          typeof parsed.level === "number" &&
          ALLOWED_HEADING_LEVELS.has(parsed.level)
        ) ?
          (parsed.level as 1 | 2 | 3 | 4)
        : undefined;
      const alignRaw = _trimString(parsed.align);
      const align =
        alignRaw && ALLOWED_BLOCK_ALIGN.has(alignRaw) ?
          (alignRaw as "left" | "center" | "right")
        : undefined;
      return {
        kind: "HeadingBlock",
        text,
        ...(level ? { level } : {}),
        ...(align ? { align } : {}),
      };
    })
    .with("ParagraphBlock", (): ChatGeneratedDashboardBlock | undefined => {
      const text = _trimString(parsed.text);
      if (!text) {
        return undefined;
      }
      const alignRaw = _trimString(parsed.align);
      const align =
        alignRaw && ALLOWED_BLOCK_ALIGN.has(alignRaw) ?
          (alignRaw as "left" | "center" | "right")
        : undefined;
      return { kind: "ParagraphBlock", text, ...(align ? { align } : {}) };
    })
    .with("QuoteBlock", (): ChatGeneratedDashboardBlock | undefined => {
      const quote = _trimString(parsed.quote);
      if (!quote) {
        return undefined;
      }
      const cite = _trimString(parsed.cite);
      return { kind: "QuoteBlock", quote, ...(cite ? { cite } : {}) };
    })
    .with("DividerBlock", (): ChatGeneratedDashboardBlock | undefined => {
      return { kind: "DividerBlock" };
    })
    .with("CalloutBlock", (): ChatGeneratedDashboardBlock | undefined => {
      const title = _trimString(parsed.title);
      const body = _trimString(parsed.body);
      if (!title || !body) {
        return undefined;
      }
      const toneRaw = _trimString(parsed.tone);
      const tone =
        toneRaw && ALLOWED_CALLOUT_TONES.has(toneRaw) ?
          (toneRaw as "info" | "warning" | "neutral")
        : undefined;
      return { kind: "CalloutBlock", title, body, ...(tone ? { tone } : {}) };
    })
    .with("ListBlock", (): ChatGeneratedDashboardBlock | undefined => {
      if (!Array.isArray(parsed.items)) {
        return undefined;
      }
      const items = parsed.items
        .filter((item): item is string => {
          return typeof item === "string" && item.trim().length > 0;
        })
        .map((item) => {
          return item.trim();
        });
      if (items.length === 0) {
        return undefined;
      }
      const listTypeRaw = _trimString(parsed.listType);
      const listType =
        listTypeRaw && ALLOWED_LIST_TYPES.has(listTypeRaw) ?
          (listTypeRaw as "ordered" | "unordered")
        : undefined;
      return { kind: "ListBlock", items, ...(listType ? { listType } : {}) };
    })
    .with("CodeBlock", (): ChatGeneratedDashboardBlock | undefined => {
      const code = _trimString(parsed.code);
      if (!code) {
        return undefined;
      }
      const language = _trimString(parsed.language);
      return { kind: "CodeBlock", code, ...(language ? { language } : {}) };
    })
    .with("TableBlock", (): ChatGeneratedDashboardBlock | undefined => {
      const data = _trimString(parsed.data);
      if (!data) {
        return undefined;
      }
      const delimiterRaw = _trimString(parsed.delimiter);
      const delimiter =
        delimiterRaw && ALLOWED_TABLE_DELIMITERS.has(delimiterRaw) ?
          (delimiterRaw as "comma" | "tab" | "pipe")
        : undefined;
      const hasHeader =
        typeof parsed.hasHeader === "boolean" ? parsed.hasHeader : undefined;
      return {
        kind: "TableBlock",
        data,
        ...(delimiter ? { delimiter } : {}),
        ...(hasHeader !== undefined ? { hasHeader } : {}),
      };
    })
    .with("Card", (): ChatGeneratedDashboardBlock | undefined => {
      const title = _trimString(parsed.title);
      return title ? { kind: "Card", title } : undefined;
    })
    .otherwise(() => {
      return undefined;
    });
}

/** Builds the user-facing summary for a dashboard block response. */
export function dashboardBlockSummary(
  block: ChatGeneratedDashboardBlock,
): string {
  return match(block)
    .with({ kind: "DataViz" }, ({ prompt, vizType }) => {
      return `Added "${prompt}" to your dashboard as a ${vizType}.`;
    })
    .with({ kind: "HeadingBlock" }, ({ text }) => {
      return `Added a heading: "${text}".`;
    })
    .with({ kind: "ParagraphBlock" }, () => {
      return "Added a paragraph to your dashboard.";
    })
    .with({ kind: "QuoteBlock" }, () => {
      return "Added a quote to your dashboard.";
    })
    .with({ kind: "DividerBlock" }, () => {
      return "Added a divider to your dashboard.";
    })
    .with({ kind: "CalloutBlock" }, ({ title }) => {
      return `Added a callout: "${title}".`;
    })
    .with({ kind: "ListBlock" }, ({ items }) => {
      return `Added a list with ${items.length} item(s) to your dashboard.`;
    })
    .with({ kind: "CodeBlock" }, () => {
      return "Added a code block to your dashboard.";
    })
    .with({ kind: "TableBlock" }, () => {
      return "Added a table to your dashboard.";
    })
    .with({ kind: "Card" }, ({ title }) => {
      return `Added a card: "${title}".`;
    })
    .exhaustive();
}
