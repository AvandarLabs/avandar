import type { LocalLlm } from "@/lib/agent/localModels/LocalLlm";

/** Where an offline message goes: the data tools, or a plain reply. */
export type OfflineMessageRoute = "data" | "chat";

const ROUTER_PROMPT = `You sort messages sent to the assistant of a data app.
data: a question or request about the user's datasets: numbers, totals, trends, rankings, comparisons, charts, tables, or a follow-up that changes the previous answer ("now by week", "only Texas").
chat: anything else: a greeting, thanks, how to use the app, or general knowledge that is not in the datasets.
Reply with JSON: {"route": "data"} or {"route": "chat"}.`;

const ROUTE_SCHEMA = {
  type: "object",
  properties: { route: { type: "string", enum: ["data", "chat"] } },
  required: ["route"],
  additionalProperties: false,
};

/**
 * Routes one message with a short, schema-constrained call to a local
 * model. A data question must run a query before the agent may reply; a chat
 * message may be answered in words. Anything unreadable counts as data,
 * since that is what the Data Explorer is for.
 */
export async function classifyOfflineMessage(
  llm: LocalLlm,
  options: Readonly<{
    modelId: string;
    message: string;
    datasetNames: readonly string[];
    previousMessage?: string;
  }>,
): Promise<OfflineMessageRoute> {
  const previous = options.previousMessage
    ? `Previous message: ${options.previousMessage}\n`
    : "";
  const completion = await llm.complete({
    modelId: options.modelId,
    messages: [
      { role: "system", content: ROUTER_PROMPT },
      {
        role: "user",
        content: `Datasets: ${options.datasetNames.join(", ")}\n${previous}Message: ${options.message}`,
      },
    ],
    maxTokens: 20,
    temperature: 0,
    jsonSchema: ROUTE_SCHEMA,
  });
  return completion.text.includes('"chat"') ? "chat" : "data";
}
