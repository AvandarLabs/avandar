import { MAX_DISCOVERY_QUERY_CHARS } from "$/utils/privacy/isReadOnlyDiscoveryQuery.ts";

/** Builds the tool definitions for the active chat surface. */
export function buildChatToolConfig(options: {
  isDataExplorer: boolean;
  isDashboards: boolean;
  clarificationCapReached: boolean;
}): Record<string, unknown> {
  const requestBody: Record<string, unknown> = {};

  if (options.isDataExplorer) {
    requestBody.tools = [
      {
        type: "function",
        function: {
          name: "generateSql",
          description:
            "Submit a DuckDB SELECT statement that answers the user's data question. Use this whenever the user asks about their data.",
          parameters: {
            type: "object",
            properties: {
              sql: {
                type: "string",
                description:
                  "Valid DuckDB SELECT. Wrap all table IDs and column names in double quotes.",
              },
            },
            required: ["sql"],
            additionalProperties: false,
          },
        },
      },
      ...(options.clarificationCapReached ?
        []
      : [
          {
            type: "function",
            function: {
              name: "clarify",
              description:
                "Ask the user one clarifying question when their request is materially ambiguous and the answer would change the SQL. Prefer fixed_options when the choices can be enumerated from metadata; the UI always offers Something else and None of the above, so re-clarify if their answer is still ambiguous. Use this BEFORE generateSql when ambiguous.",
              parameters: {
                type: "object",
                properties: {
                  question: {
                    type: "string",
                    maxLength: 200,
                    description:
                      "≤25 words, neutrally phrased, single question.",
                  },
                  rationale: {
                    type: "string",
                    maxLength: 200,
                    description:
                      "Optional one-sentence explanation of why you are asking.",
                  },
                  responseShape: {
                    oneOf: [
                      {
                        type: "object",
                        properties: {
                          kind: { const: "free_text" },
                          placeholder: { type: "string", maxLength: 80 },
                        },
                        required: ["kind"],
                        additionalProperties: false,
                      },
                      {
                        type: "object",
                        properties: {
                          kind: { const: "fixed_options" },
                          options: {
                            type: "array",
                            minItems: 2,
                            maxItems: 8,
                            items: { type: "string", maxLength: 80 },
                          },
                          multi: { type: "boolean" },
                        },
                        required: ["kind", "options", "multi"],
                        additionalProperties: false,
                      },
                      {
                        type: "object",
                        properties: {
                          kind: { const: "discovery" },
                          query: {
                            type: "string",
                            description:
                              "A short DuckDB SELECT statement whose results populate the dropdown. Read-only; no semicolons.",
                            maxLength: MAX_DISCOVERY_QUERY_CHARS,
                          },
                          column: {
                            type: "string",
                            description:
                              "The column the user is choosing values from. Informs PII detection.",
                            maxLength: 80,
                          },
                          multi: { type: "boolean" },
                        },
                        required: ["kind", "query", "column", "multi"],
                        additionalProperties: false,
                      },
                    ],
                  },
                },
                required: ["question", "responseShape"],
                additionalProperties: false,
              },
            },
          },
        ]),
    ];
    requestBody.tool_choice = "auto";
  }

  if (options.isDashboards) {
    requestBody.tools = [
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
    ];
    requestBody.tool_choice = "auto";
  }

  return requestBody;
}
