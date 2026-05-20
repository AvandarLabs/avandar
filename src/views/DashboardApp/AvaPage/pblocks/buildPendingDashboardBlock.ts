import { VizConfigs } from "$/models/vizs/VizConfig/VizConfigs";
import { DEFAULT_GLOBAL_FILTER_SUBSCRIPTION } from "@/views/DashboardApp/AvaPage/pblocks/DataVizPBlock/DataVizPBlock/dataVizFilters";
import type { AvaPageData } from "@/views/DashboardApp/AvaPage/AvaPage.types";
import type { ChatGeneratedDashboardBlock } from "$/types/chat.types";

type PuckContentItem = AvaPageData["content"][number];

function createBlockId(type: string): string {
  return `${type}-${crypto.randomUUID()}`;
}

function buildDataVizItem(
  block: Extract<ChatGeneratedDashboardBlock, { kind: "DataViz" }>,
): PuckContentItem {
  return {
    type: "DataViz",
    props: {
      id: createBlockId("DataViz"),
      nlQuery: {
        prompt: block.prompt,
        rawSql: block.sql,
        generations: [
          {
            prompt: block.prompt,
            rawSql: block.sql,
          },
        ],
      },
      vizType: block.vizType,
      vizConfig: VizConfigs.makeEmptyConfig(block.vizType),
      globalFilterSubscription: DEFAULT_GLOBAL_FILTER_SUBSCRIPTION,
      localFilters: [],
    },
  };
}

/**
 * Convert a chat-generated dashboard block into a Puck content item ready to
 * append to `AvaPageData.content`.
 */
export function buildPendingDashboardBlock(
  block: ChatGeneratedDashboardBlock,
): PuckContentItem {
  switch (block.kind) {
    case "DataViz":
      return buildDataVizItem(block);
    case "HeadingBlock":
      return {
        type: "HeadingBlock",
        props: {
          id: createBlockId("HeadingBlock"),
          text: block.text,
          level: block.level ?? 2,
          align: block.align ?? "left",
        },
      };
    case "ParagraphBlock":
      return {
        type: "ParagraphBlock",
        props: {
          id: createBlockId("ParagraphBlock"),
          text: block.text,
          align: block.align ?? "left",
        },
      };
    case "QuoteBlock":
      return {
        type: "QuoteBlock",
        props: {
          id: createBlockId("QuoteBlock"),
          quote: block.quote,
          cite: block.cite ?? "",
        },
      };
    case "DividerBlock":
      return {
        type: "DividerBlock",
        props: {
          id: createBlockId("DividerBlock"),
        },
      };
    case "CalloutBlock":
      return {
        type: "CalloutBlock",
        props: {
          id: createBlockId("CalloutBlock"),
          title: block.title,
          body: block.body,
          tone: block.tone ?? "neutral",
        },
      };
    case "ListBlock":
      return {
        type: "ListBlock",
        props: {
          id: createBlockId("ListBlock"),
          type: block.listType ?? "unordered",
          items: block.items.map((text) => {
            return { text };
          }),
        },
      };
    case "CodeBlock":
      return {
        type: "CodeBlock",
        props: {
          id: createBlockId("CodeBlock"),
          code: block.code,
          language: block.language ?? "",
        },
      };
    case "TableBlock":
      return {
        type: "TableBlock",
        props: {
          id: createBlockId("TableBlock"),
          data: block.data,
          delimiter: block.delimiter ?? "comma",
          hasHeader: block.hasHeader ?? true,
        },
      };
    case "Card":
      return {
        type: "Card",
        props: {
          id: createBlockId("Card"),
          title: block.title,
          content: [],
        },
      };
    default: {
      const _exhaustive: never = block;
      return _exhaustive;
    }
  }
}
