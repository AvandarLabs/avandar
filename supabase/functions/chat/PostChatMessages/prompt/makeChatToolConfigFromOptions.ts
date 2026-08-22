import type { ChatPageContext } from "$/models/chat/ChatPageContext/ChatPageContext.ts";

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
              "DataViz only: DuckDB SELECT. Use the short table aliases from the schema (t0, t1, …). Wrap aliases and column names in double quotes.",
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

const PROPOSE_CASE_TYPE_TOOL_DEFINITIONS = [
  {
    type: "function",
    function: {
      name: "proposeCaseType",
      description:
        "Propose ONE fully prefilled case type (concept) draft for the user to review and tweak in an editable card. A case type is a semantic record assembled from whichever datasets hold its fields, so pull columns from EVERY dataset that contributes, not just one. Fill in every field with your best guess: name, description, the source datasets with their join keys, the label column, one attribute per relevant column with a sensible value picker, and any manual-entry attributes worth offering. Copy dataset and column ids verbatim from the catalog. Nothing is saved until the user confirms the card, so prefer proposing a complete draft over asking more questions.",
      parameters: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "Singular, human-readable case type name.",
          },
          description: {
            type: "string",
            description: "One sentence describing what one case represents.",
          },
          allowManualCreation: {
            type: "boolean",
            description:
              "Whether users may create cases by hand as well as from the datasets.",
          },
          sourceDatasets: {
            type: "array",
            minItems: 1,
            description:
              "Every dataset this case type draws columns from. Include a dataset whenever it holds a field the case type needs; joining pieces of several datasets into one record is the normal case, not the exception.",
            items: {
              type: "object",
              properties: {
                datasetId: {
                  type: "string",
                  description: "Catalog dataset id, copied verbatim.",
                },
                primaryKeyColumnId: {
                  type: "string",
                  description:
                    "Column in THIS dataset holding the shared entity key. The key columns across all source datasets must identify the same real-world thing by the same values (for example a FIPS code in both), because rows are matched to a case by comparing these columns. Pick columns whose names and types line up; if no column in a dataset carries the shared key, leave that dataset out entirely.",
                },
              },
              required: ["datasetId", "primaryKeyColumnId"],
              additionalProperties: false,
            },
          },
          labelColumnId: {
            type: "string",
            description:
              "Column id whose value names each case in the UI. Must be one of `attributes`.",
          },
          attributes: {
            type: "array",
            description:
              "One entry per dataset column worth mapping, across all source datasets. Preselect the useful ones with isIncluded true and offer marginal ones with isIncluded false.",
            items: {
              type: "object",
              properties: {
                datasetId: {
                  type: "string",
                  description:
                    "Which source dataset this column comes from. Must be one of `sourceDatasets`.",
                },
                columnId: {
                  type: "string",
                  description: "Catalog column id, copied verbatim.",
                },
                name: {
                  type: "string",
                  description:
                    "Attribute name, humanized from the column name (for example deaths_total to Total deaths). Name it for what it means to the case type, not for which dataset it came from, and keep names unique across datasets.",
                },
                description: { type: "string" },
                isIncluded: {
                  type: "boolean",
                  description: "Whether the card preselects this attribute.",
                },
                valuePickerRuleType: {
                  type: "string",
                  enum: [
                    "most_frequent",
                    "first",
                    "sum",
                    "avg",
                    "count",
                    "max",
                    "min",
                  ],
                  description:
                    "Which value to keep when a dataset holds several rows per case. Use sum or max for cumulative measures, first for dates, most_frequent for categories.",
                },
              },
              required: [
                "datasetId",
                "columnId",
                "name",
                "isIncluded",
                "valuePickerRuleType",
              ],
              additionalProperties: false,
            },
          },
          manualEntryAttributes: {
            type: "array",
            description:
              "Fields users fill in by hand that no dataset column supplies, such as review notes or a triage status.",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                description: { type: "string" },
                isIncluded: {
                  type: "boolean",
                  description: "Whether the card preselects this attribute.",
                },
              },
              required: ["name", "isIncluded"],
              additionalProperties: false,
            },
          },
        },
        required: [
          "name",
          "description",
          "allowManualCreation",
          "sourceDatasets",
          "labelColumnId",
          "attributes",
          "manualEntryAttributes",
        ],
        additionalProperties: false,
      },
    },
  },
] as const;

const CREATE_CASE_TYPES_TOOL_DEFINITIONS = [
  {
    type: "function",
    function: {
      name: "createCaseTypes",
      description:
        "Create one or more case types (concepts) in the workspace after the user has chosen them. Copy dataset and column ids verbatim from the schema. Each case needs a join key for every dataset it draws from, and at least one mapped attribute.",
      parameters: {
        type: "object",
        properties: {
          cases: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                description: { type: "string" },
                allowManualCreation: { type: "boolean" },
                identities: {
                  type: "array",
                  minItems: 1,
                  description:
                    "One entry per contributing dataset, each naming the column that holds the shared entity key.",
                  items: {
                    type: "object",
                    properties: {
                      datasetId: { type: "string" },
                      primaryKeyColumnId: { type: "string" },
                    },
                    required: ["datasetId", "primaryKeyColumnId"],
                    additionalProperties: false,
                  },
                },
                attributes: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      description: { type: "string" },
                      kind: {
                        type: "string",
                        enum: ["dataset_column", "manual_entry"],
                      },
                      datasetId: { type: "string" },
                      columnId: { type: "string" },
                      isLabel: { type: "boolean" },
                    },
                    required: ["name", "kind"],
                  },
                },
              },
              required: ["name", "identities", "attributes"],
            },
          },
        },
        required: ["cases"],
        additionalProperties: false,
      },
    },
  },
] as const;

/** Builds the always-on OpenRouter tool catalog for unified chat. */
export function makeChatToolConfigFromOptions(
  options: Readonly<{
    clarificationCapReached: boolean;
    app?: ChatPageContext.ChatApp;
  }>,
): Record<string, unknown> {
  const explorerTools = buildDataExplorerToolDefinitions(
    options.clarificationCapReached,
  );
  const clarifyTools = explorerTools.filter(propEq("function.name", "clarify"));
  if (options.app === "case-manager") {
    return {
      tools: [
        ...clarifyTools,
        ...PROPOSE_CASE_TYPE_TOOL_DEFINITIONS,
        ...CREATE_CASE_TYPES_TOOL_DEFINITIONS,
      ],
      tool_choice: "auto",
    };
  }
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
