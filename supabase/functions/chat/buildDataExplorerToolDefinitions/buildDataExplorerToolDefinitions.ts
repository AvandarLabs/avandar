import {
  MAX_DISCOVERY_CANDIDATE_CHARS,
  MAX_DISCOVERY_CANDIDATE_VALUES,
} from "@sbfn/chat/PostChatMessages/parsing/makeDiscoveryCandidateValuesFromModelOutput.ts";
import { MAX_DISCOVERY_QUERY_CHARS } from "$/utils/privacy/isReadOnlyDiscoveryQuery.ts";

type DataExplorerToolDefinition = {
  type: "function";
  function: {
    name: "generateSql" | "clarify";
    description: string;
    parameters: Record<string, unknown>;
  };
};

const GENERATE_SQL_TOOL = {
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
            "Valid DuckDB SELECT. Use the short table aliases from the schema (t0, t1, …). Wrap aliases and column names in double quotes.",
        },
      },
      required: ["sql"],
      additionalProperties: false,
    },
  },
} as const satisfies DataExplorerToolDefinition;

const CLARIFY_TOOL = {
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
          description: "≤25 words, neutrally phrased, single question.",
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
                candidateValues: {
                  type: "array",
                  maxItems: MAX_DISCOVERY_CANDIDATE_VALUES,
                  items: {
                    type: "string",
                    maxLength: MAX_DISCOVERY_CANDIDATE_CHARS,
                  },
                  description:
                    "Possible stored representations inferred only from the user's prompt and general knowledge, never from dataset values. Include the user's exact wording plus plausible codes or abbreviations.",
                },
              },
              required: ["kind", "query", "column", "multi", "candidateValues"],
              additionalProperties: false,
            },
          ],
        },
      },
      required: ["question", "responseShape"],
      additionalProperties: false,
    },
  },
} as const satisfies DataExplorerToolDefinition;

/** Builds the tool definitions available on the Data Explorer chat surface. */
export function buildDataExplorerToolDefinitions(
  clarificationCapReached = false,
): DataExplorerToolDefinition[] {
  return clarificationCapReached
    ? [GENERATE_SQL_TOOL]
    : [GENERATE_SQL_TOOL, CLARIFY_TOOL];
}
