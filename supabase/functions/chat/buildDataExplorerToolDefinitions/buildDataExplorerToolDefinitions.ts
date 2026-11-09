import {
  MAX_DISCOVERY_CANDIDATE_CHARS,
  MAX_DISCOVERY_CANDIDATE_GROUPS,
  MAX_DISCOVERY_CANDIDATE_VALUES,
  MAX_DISCOVERY_CANDIDATES_PER_GROUP,
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
      "Submit a DuckDB SELECT that answers a question about rows, totals, or trends. The Data Explorer shows the result. Do not use this to list or compare columns: those are already in the schema.",
    parameters: {
      type: "object",
      properties: {
        sql: {
          type: "string",
          description:
            "Valid DuckDB SELECT. Use the short table aliases from the schema (t0, t1, …). Wrap aliases and column names in double quotes.",
        },
        summary: {
          type: "string",
          maxLength: 400,
          description:
            'One or two short, plain sentences shown to the user as your reply: what the result shows, which dataset it uses, and any choice you made (the period, what a word like "most" was taken to mean, what was included or left out). You never see the results, so do not state numbers or findings. No SQL, table aliases, or column names in quotes.',
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
                candidateGroups: {
                  type: "array",
                  maxItems: MAX_DISCOVERY_CANDIDATE_GROUPS,
                  items: {
                    type: "array",
                    maxItems: MAX_DISCOVERY_CANDIDATES_PER_GROUP,
                    items: {
                      type: "string",
                      maxLength: MAX_DISCOVERY_CANDIDATE_CHARS,
                    },
                  },
                  description:
                    'With multi: true, one group per value the user named, each listing that value\'s plausible stored forms, e.g. [["California", "CA"], ["Texas", "TX"]]. The client answers on its own when every group matches exactly one stored value.',
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
