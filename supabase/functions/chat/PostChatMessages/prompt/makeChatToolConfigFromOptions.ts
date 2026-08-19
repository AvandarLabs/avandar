import { propEq } from "@avandar/utils";
import { buildDataExplorerToolDefinitions } from "@sbfn/chat/buildDataExplorerToolDefinitions/buildDataExplorerToolDefinitions.ts";

const DASHBOARD_TOOL_DEFINITIONS = [
  {
    type: "function",
    function: {
      name: "addDashboardBlock",
      description:
        "Append a new dashboard block (P-block) to the page the user is editing. Set `kind` and the fields for that block type.",
      parameters: {
        type: "object",
        properties: {
          kind: {
            type: "string",
            enum: [
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
            ],
            description:
              "Block type to create. Use HeadingBlock for titles, ParagraphBlock for body text, DataViz only for SQL-driven charts/tables.",
          },
          prompt: {
            type: "string",
            description: "DataViz only: short label for the chart.",
            maxLength: 200,
          },
          sql: {
            type: "string",
            description:
              "DataViz only: DuckDB SELECT. Wrap dataset ids and column names in double quotes.",
          },
          vizType: {
            type: "string",
            enum: ["table", "bar", "line", "area", "scatter", "pie"],
            description: "DataViz only: visualization type.",
          },
          text: {
            type: "string",
            description: "HeadingBlock or ParagraphBlock: display text.",
          },
          level: {
            type: "number",
            description: "HeadingBlock only: 1, 2, 3, or 4.",
          },
          align: {
            type: "string",
            enum: ["left", "center", "right"],
            description: "HeadingBlock or ParagraphBlock alignment.",
          },
          quote: {
            type: "string",
            description: "QuoteBlock: quotation body.",
          },
          cite: {
            type: "string",
            description: "QuoteBlock: attribution.",
          },
          title: {
            type: "string",
            description: "CalloutBlock or Card title.",
          },
          body: {
            type: "string",
            description: "CalloutBlock body text.",
          },
          tone: {
            type: "string",
            enum: ["info", "warning", "neutral"],
            description: "CalloutBlock tone.",
          },
          items: {
            type: "array",
            items: { type: "string" },
            description: "ListBlock: list item strings.",
          },
          listType: {
            type: "string",
            enum: ["ordered", "unordered"],
            description: "ListBlock list style.",
          },
          code: {
            type: "string",
            description: "CodeBlock source code.",
          },
          language: {
            type: "string",
            description: "CodeBlock language hint.",
          },
          data: {
            type: "string",
            description: "TableBlock: CSV or delimited table text.",
          },
          delimiter: {
            type: "string",
            enum: ["comma", "tab", "pipe"],
            description: "TableBlock delimiter.",
          },
          hasHeader: {
            type: "boolean",
            description: "TableBlock: first row is header.",
          },
        },
        required: ["kind"],
        additionalProperties: false,
      },
    },
  },
] as const;

/** Builds the always-on OpenRouter tool catalog for unified chat. */
export function makeChatToolConfigFromOptions(
  options: Readonly<{ clarificationCapReached: boolean }>,
): Record<string, unknown> {
  const explorerTools = buildDataExplorerToolDefinitions(
    options.clarificationCapReached,
  );
  const clarifyTools = explorerTools.filter(propEq("function.name", "clarify"));
  const generateSqlTools = explorerTools.filter(
    propEq("function.name", "generateSql"),
  );
  const tools = [
    ...clarifyTools,
    ...generateSqlTools,
    ...DASHBOARD_TOOL_DEFINITIONS,
  ];
  return { tools, tool_choice: "auto" };
}
