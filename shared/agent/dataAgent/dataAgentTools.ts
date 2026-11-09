import { arr, bool, obj, oneOf, opt, str } from "@earendil-works/pi-schema";

/*
 * The data agent's tools as the model sees them: name, description, and
 * argument schema. The browser's tools (src/lib/agent/dataAgent) add what
 * runs, and the agent proxy sends exactly these to the model, so the two can
 * never disagree about a tool.
 */

const RUN_QUERY_PARAMETERS = obj({
  sql: str({
    description: "One DuckDB SELECT or WITH statement over the aliases.",
  }),
  summary: str({
    description:
      "One or two plain sentences for the user: what the result shows, the dataset, and your choices.",
  }),
  chart: opt(
    oneOf(["bar", "line", "area", "scatter", "pie"], {
      description: "Only when the user asked for a chart, graph, or plot.",
    }),
  ),
});

/** Runs the query that answers the question and shows it to the user. */
export const RUN_QUERY_TOOL = {
  name: "run_query",
  label: "Run query",
  description:
    "Runs the one DuckDB query that answers a question about rows and shows its result to the user as a table or chart. Returns only the row count and column names. A result ends your turn. Do not use it to list or compare columns: those are already under DATASETS.",
  parameters: RUN_QUERY_PARAMETERS,
};

const LOOKUP_VALUES_PARAMETERS = obj({
  table: str({ description: "Dataset alias, such as t0." }),
  column: str({ description: "Text column to search." }),
  values: arr(
    obj({
      named: str({ description: "What the user wrote, such as UK." }),
      forms: arr(str(), {
        description:
          "Stored forms to try that mean exactly the same thing: full name, abbreviation, code.",
      }),
    }),
    { description: "One entry per value the user named." },
  ),
  question: str({
    description:
      "Question for the user if the device cannot settle it, such as: Which of these is the UK?",
  }),
});

/** Finds how values the user named are stored, on the user's device. */
export const LOOKUP_VALUES_TOOL = {
  name: "lookup_values",
  label: "Look up values",
  description:
    "Finds how values the user named are stored in a text column. Runs on the user's device; returns only matching stored values or the user's pick.",
  parameters: LOOKUP_VALUES_PARAMETERS,
};

const ASK_USER_PARAMETERS = obj({
  question: str({ description: "One neutral question, under 20 words." }),
  options: arr(str(), {
    minItems: 2,
    maxItems: 5,
    description: "Answers the data can support.",
  }),
  multi: opt(bool({ description: "Whether the user may pick several." })),
});

/** Asks the user one short question with options. */
export const ASK_USER_TOOL = {
  name: "ask_user",
  label: "Ask the user",
  description:
    "Asks the user one short question with options and returns the answer. Only for choices that change who or what is counted.",
  parameters: ASK_USER_PARAMETERS,
};

/**
 * The online data agent's tools, in the order the model sees them. The
 * agent proxy builds every request's tool list from this.
 */
export const DATA_AGENT_TOOLS = [
  RUN_QUERY_TOOL,
  LOOKUP_VALUES_TOOL,
  ASK_USER_TOOL,
] as const;

/**
 * Every prompt version the agent proxy serves. A tab opened before a deploy
 * keeps naming the version it loaded, so older versions stay served until
 * no open tab can still use them.
 */
export const DATA_AGENT_PROMPT_IDS = [
  "data-agent-v1",
  "data-agent-v2",
  "data-agent-v3",
] as const;

/** One served prompt version. */
export type DataAgentPromptId = (typeof DATA_AGENT_PROMPT_IDS)[number];

/**
 * The version of the data agent's prompt this build uses. Only the prompt is
 * versioned: every version shares the same tools. The browser names it in
 * the proxy URL. v2 adds the current page block. v3 adds the attached
 * and mentioned blocks.
 */
export const DATA_AGENT_PROMPT_ID: DataAgentPromptId = "data-agent-v3";

/** Whether the proxy serves a prompt version. */
export function isDataAgentPromptId(value: string): value is DataAgentPromptId {
  return (DATA_AGENT_PROMPT_IDS as readonly string[]).includes(value);
}
