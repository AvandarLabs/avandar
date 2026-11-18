import {
  arr,
  bool,
  int,
  obj,
  oneOf,
  opt,
  str,
} from "@earendil-works/pi-schema";
import {
  DASHBOARD_BLOCK_KINDS,
  DASHBOARD_VIZ_TYPES,
} from "$/agent/dashboardBlocks/DashboardBlockFields.ts";

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

const DASHBOARD_BLOCK_PARAMETERS = obj({
  kind: oneOf(DASHBOARD_BLOCK_KINDS, {
    description:
      "DataViz for a chart or table from SQL. Every other kind holds text you write.",
  }),
  prompt: opt(str({ description: "DataViz: a short chart title." })),
  sql: opt(
    str({
      description:
        "DataViz: one DuckDB SELECT or WITH statement over the aliases.",
    }),
  ),
  vizType: opt(
    oneOf(DASHBOARD_VIZ_TYPES, { description: "DataViz: how to show it." }),
  ),
  text: opt(str({ description: "HeadingBlock or ParagraphBlock text." })),
  level: opt(int({ description: "HeadingBlock: 1 to 4." })),
  align: opt(oneOf(["left", "center", "right"])),
  quote: opt(str({ description: "QuoteBlock: the quotation." })),
  cite: opt(str({ description: "QuoteBlock: who said it." })),
  title: opt(str({ description: "CalloutBlock or Card title." })),
  body: opt(str({ description: "CalloutBlock body." })),
  tone: opt(oneOf(["info", "warning", "neutral"])),
  items: opt(arr(str(), { description: "ListBlock items." })),
  listType: opt(oneOf(["ordered", "unordered"])),
  code: opt(str({ description: "CodeBlock source." })),
  language: opt(str({ description: "CodeBlock language." })),
  data: opt(str({ description: "TableBlock: CSV text." })),
  delimiter: opt(oneOf(["comma", "tab", "pipe"])),
  hasHeader: opt(bool({ description: "TableBlock: first row is a header." })),
});

const ADD_DASHBOARD_BLOCK_PARAMETERS = obj({
  dashboard: str({
    description:
      'The dashboard\'s name exactly as you saw it, or "current" for the dashboard on the current page.',
  }),
  block: DASHBOARD_BLOCK_PARAMETERS,
  summary: str({
    description: "One sentence for the user: what you added, and where.",
  }),
});

/** Adds one block to a dashboard, through the open editor or a card. */
export const ADD_DASHBOARD_BLOCK_TOOL = {
  name: "add_dashboard_block",
  label: "Add to dashboard",
  description:
    "Adds one block to a dashboard: a chart or table from SQL, or text you write. The dashboard open in the editor gets it unsaved; any other dashboard gets it after the user confirms a card. Only when the user asks to add something to a dashboard. Returns only what happened, never rows.",
  parameters: ADD_DASHBOARD_BLOCK_PARAMETERS,
};

/**
 * The built-in tools prompts v1 to v5 serve, in the order the model sees
 * them. Plugin tools, when a version offers them, follow the built-in ones.
 */
export const DATA_AGENT_TOOLS = [
  RUN_QUERY_TOOL,
  LOOKUP_VALUES_TOOL,
  ASK_USER_TOOL,
] as const;

const DATA_AGENT_V6_TOOLS = [
  ...DATA_AGENT_TOOLS,
  ADD_DASHBOARD_BLOCK_TOOL,
] as const;

/** One built-in tool definition the proxy may serve. */
export type DataAgentToolSpec = (typeof DATA_AGENT_V6_TOOLS)[number];

/**
 * Every prompt version the agent proxy serves. A tab opened before a deploy
 * keeps naming the version it loaded, so older versions stay served until
 * no open tab can still use them.
 */
export const DATA_AGENT_PROMPT_IDS = [
  "data-agent-v1",
  "data-agent-v2",
  "data-agent-v3",
  "data-agent-v4",
  "data-agent-v5",
  "data-agent-v6",
] as const;

/** One served prompt version. */
export type DataAgentPromptId = (typeof DATA_AGENT_PROMPT_IDS)[number];

/**
 * The built-in tools each prompt version serves. The proxy builds every
 * request's tool list from it, then adds plugin tools for a version in
 * `PLUGIN_TOOL_PROMPT_IDS`, and the browser adds only these built-in tools,
 * so a tab on an older version never meets a tool its prompt does not
 * describe. v6 adds `add_dashboard_block`.
 */
export const DATA_AGENT_TOOLS_BY_PROMPT_ID: Readonly<
  Record<DataAgentPromptId, readonly DataAgentToolSpec[]>
> = {
  "data-agent-v1": DATA_AGENT_TOOLS,
  "data-agent-v2": DATA_AGENT_TOOLS,
  "data-agent-v3": DATA_AGENT_TOOLS,
  "data-agent-v4": DATA_AGENT_TOOLS,
  "data-agent-v5": DATA_AGENT_TOOLS,
  "data-agent-v6": DATA_AGENT_V6_TOOLS,
};

/**
 * The version of the data agent's prompt this build uses. The browser names
 * it in the proxy URL. v2 adds the current page block. v3 adds the attached
 * and mentioned blocks. v4 adds a TOOLS bullet about plugin tools. v5 adds
 * the code lists of columns a dictionary is attached to. v6 adds the
 * dashboard tool and its rules.
 */
export const DATA_AGENT_PROMPT_ID: DataAgentPromptId = "data-agent-v5";

/**
 * The prompt versions whose TOOLS section describes plugin tools. The proxy
 * offers plugin tools only to these, since a tab on an older version has no
 * code to run them.
 */
export const PLUGIN_TOOL_PROMPT_IDS: readonly DataAgentPromptId[] = [
  "data-agent-v4",
  "data-agent-v5",
  "data-agent-v6",
];

/** Whether the proxy serves a prompt version. */
export function isDataAgentPromptId(value: string): value is DataAgentPromptId {
  return (DATA_AGENT_PROMPT_IDS as readonly string[]).includes(value);
}
