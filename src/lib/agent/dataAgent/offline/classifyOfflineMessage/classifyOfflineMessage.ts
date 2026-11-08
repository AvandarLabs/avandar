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

/** Messages that are plainly conversation, not a question about data. */
const CHAT_PATTERN =
  /^((hi|hello|hey)( there)?|thanks|thank you|thx|ok|okay|great|cool|bye|good (morning|afternoon|evening))[\s!.,]*$|^(how do i|how can i|what can you|who are you|what are you|help\b)/i;

/** Words that only a question about the data would use. */
const DATA_PATTERN =
  /\b(how many|how much|total|count|sum|average|mean|median|most|least|top|highest|lowest|trend|over time|per|by (day|week|month|year|state|county|country|region)|daily|weekly|monthly|yearly|compare|vs|versus|chart|graph|plot|table|show|list|which|when|where|rate|percent|share|change|growth|increase|decrease|rank)\b/i;

/**
 * Settles the clear cases without a model call: greetings, thanks, and
 * how-to questions are chat; a message using analysis words or naming a
 * dataset is data. Returns undefined when only a model can tell.
 */
export function routeOfflineMessageByRules(
  message: string,
  datasetNames: readonly string[],
): OfflineMessageRoute | undefined {
  const text = message.trim();
  if (CHAT_PATTERN.test(text)) {
    return "chat";
  }
  const namesDataset = datasetNames.some((name) => {
    const stem = name.replace(/\.[a-z0-9]+$/i, "").toLowerCase();
    return stem.length > 2 && text.toLowerCase().includes(stem);
  });
  return DATA_PATTERN.test(text) || namesDataset ? "data" : undefined;
}

/**
 * Routes one message: by rules when they settle it, otherwise with a short,
 * schema-constrained call to a local model. Most Data Explorer messages are
 * settled by rules, which saves a model call and keeps the answer model's
 * cached prompt warm. A data question must run a query before the agent
 * may reply; a chat message may be answered in words. Anything unreadable
 * counts as data, since that is what the Data Explorer is for.
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
  const byRules = routeOfflineMessageByRules(
    options.message,
    options.datasetNames,
  );
  if (byRules) {
    return byRules;
  }
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
