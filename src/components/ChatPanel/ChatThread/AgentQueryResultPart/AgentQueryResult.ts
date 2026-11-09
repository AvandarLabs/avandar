import { z } from "zod";

const CHART_TYPES = ["table", "bar", "line", "area", "scatter", "pie"] as const;

const AgentQueryResultSchema = z.object({
  version: z.literal(1),
  sql: z.string().min(1),
  chartType: z.enum(CHART_TYPES),
  title: z.string().min(1),
  display: z.enum(["embed", "link"]),
});

/**
 * A query the agent ran for the user outside the Data Explorer, as the
 * chat thread stores it. Holds the SQL and how to show it, never rows: the
 * result runs again in the browser whenever the message is shown.
 */
export type AgentQueryResultData = z.infer<typeof AgentQueryResultSchema>;

/** The assistant-ui `data` part name the chat renders results by. */
const PART_NAME = "agent-query-result";

/** Creates, stores, and reads the agent's query results in the chat. */
export const AgentQueryResult = {
  PART_NAME,

  /** A result from one `run_query` call. No chart shows as a table. */
  create: (
    options: Readonly<{ sql: string; chart?: string; title: string }>,
  ): AgentQueryResultData => {
    const chartType = CHART_TYPES.find((type) => {
      return type === options.chart;
    });
    return {
      version: 1,
      sql: options.sql,
      chartType: chartType ?? "table",
      title: options.title,
      display: "embed",
    };
  },

  /** The message part that carries a result in an assistant reply. */
  toDataPart: (
    result: AgentQueryResultData,
  ): { type: "data"; name: string; data: AgentQueryResultData } => {
    return { type: "data", name: PART_NAME, data: result };
  },

  /** Reads stored data, or undefined when it is not a valid result. */
  parse: (value: unknown): AgentQueryResultData | undefined => {
    const parsed = AgentQueryResultSchema.safeParse(value);
    return parsed.success ? parsed.data : undefined;
  },
};
