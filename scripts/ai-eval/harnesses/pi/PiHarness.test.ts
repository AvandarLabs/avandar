import { describe, expect, it } from "vitest";
import { createPiConversation } from "./PiHarness";
import type { EvalQuestion } from "../../EvalQuestion";
import type { EvalDatabase } from "../../runtime/EvalDatabase";
import type { DataAgent } from "@/lib/agent/dataAgent/createDataAgent/createDataAgent";

const QUESTION = {
  id: "Q01",
  category: "basic",
  prompt: "How many cases?",
  clarification: "not_needed",
  truth: {},
} as unknown as EvalQuestion;

/**
 * A data agent whose answer records one billed model call, then fails the
 * way `createDataAgent` does when a later call is refused.
 */
function _createFailingAgent(): DataAgent {
  const messages: unknown[] = [];
  return {
    agent: { state: { messages } },
    ask: async () => {
      messages.push(
        { role: "user", content: "How many cases?" },
        {
          role: "assistant",
          content: [],
          usage: {
            input: 100,
            output: 20,
            cacheRead: 30,
            cacheWrite: 0,
            reasoning: 5,
            cost: { total: 0.01 },
          },
        },
      );
      throw new Error("429 Too Many Requests");
    },
  } as unknown as DataAgent;
}

describe("createPiConversation", () => {
  it("grades a failed model call as a miss instead of rejecting", async () => {
    const conversation = createPiConversation({
      database: {} as EvalDatabase,
      createAgent: _createFailingAgent,
    });

    const answer = await conversation.ask(QUESTION);

    expect(answer.finalSql).toBeUndefined();
    expect(answer.result).toBeUndefined();
    expect(answer).toMatchObject({
      error: "429 Too Many Requests",
      assistantText: "",
      clarifications: [],
      valuesSentToModel: [],
      usage: {
        calls: 1,
        promptTokens: 130,
        cachedPromptTokens: 30,
        completionTokens: 20,
        reasoningTokens: 5,
        cost: 0.01,
      },
    });
    expect(answer.latencyMs).toBeGreaterThanOrEqual(0);
  });
});
