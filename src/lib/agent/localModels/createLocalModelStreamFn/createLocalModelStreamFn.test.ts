import { Agent } from "@earendil-works/pi-agent-core";
import { obj, str } from "@earendil-works/pi-schema";
import { describe, expect, it, vi } from "vitest";
import {
  createLocalModel,
  createLocalModelStreamFn,
} from "@/lib/agent/localModels/createLocalModelStreamFn/createLocalModelStreamFn";
import {
  buildLocalActionSchema,
  parseLocalAction,
} from "@/lib/agent/localModels/createLocalModelStreamFn/localActionFormat";
import type {
  LocalLlm,
  LocalLlmRequest,
} from "@/lib/agent/localModels/LocalLlm";
import type { AgentTool } from "@earendil-works/pi-agent-core";

const ECHO_PARAMETERS = obj({ word: str({ description: "A word." }) });

function _createEchoTool(execute = vi.fn()): AgentTool<typeof ECHO_PARAMETERS> {
  return {
    name: "echo",
    label: "Echo",
    description: "Repeats a word.",
    parameters: ECHO_PARAMETERS,
    execute: async (_toolCallId, params) => {
      execute(params);
      return {
        content: [{ type: "text", text: `echoed ${params.word}` }],
        details: {},
      };
    },
  };
}

function _createScriptedLlm(replies: readonly string[]): {
  llm: LocalLlm;
  requests: LocalLlmRequest[];
} {
  const requests: LocalLlmRequest[] = [];
  const queue = [...replies];
  return {
    requests,
    llm: {
      complete: async (request) => {
        requests.push(request);
        return {
          text: queue.shift() ?? '{"action":"reply","text":"done"}',
          promptTokens: 100,
          completionTokens: 10,
        };
      },
    },
  };
}

describe("localActionFormat", () => {
  it("allows one call per tool plus a plain reply", () => {
    const schema = buildLocalActionSchema([_createEchoTool()]) as {
      anyOf: Array<{ properties: { action: { enum: string[] } } }>;
    };

    expect(
      schema.anyOf.map((option) => {
        return option.properties.action.enum[0];
      }),
    ).toEqual(["echo", "reply"]);
  });

  it("leaves out the reply when a tool call is required", () => {
    const schema = buildLocalActionSchema([_createEchoTool()], {
      isReplyAllowed: false,
    }) as { anyOf: unknown[] };

    expect(schema.anyOf).toHaveLength(1);
  });

  it("reads a tool call and a reply", () => {
    expect(
      parseLocalAction('{"action":"echo","args":{"word":"hi"}}', ["echo"]),
    ).toEqual({ kind: "tool", name: "echo", args: { word: "hi" } });
    expect(
      parseLocalAction('{"action":"reply","text":"Hi"}', ["echo"]),
    ).toEqual({ kind: "reply", text: "Hi" });
  });

  it("skips the empty thinking block Qwen3 writes before the JSON", () => {
    expect(
      parseLocalAction(
        '<think>\n\n</think>\n\n{"action":"echo","args":{"word":"hi"}}',
        ["echo"],
      ),
    ).toEqual({ kind: "tool", name: "echo", args: { word: "hi" } });
  });

  it("treats output that is not an action as a reply", () => {
    expect(parseLocalAction("Hello there", ["echo"])).toEqual({
      kind: "reply",
      text: "Hello there",
    });
  });
});

describe("createLocalModelStreamFn", () => {
  function _createAgent(llm: LocalLlm, execute = vi.fn()): Agent {
    return new Agent({
      initialState: {
        systemPrompt: "You help.",
        model: createLocalModel({
          id: "Qwen3-4B-q4f16_1-MLC",
          name: "Qwen3 4B",
          contextWindow: 8192,
        }),
        thinkingLevel: "off",
        tools: [_createEchoTool(execute)],
      },
      streamFn: createLocalModelStreamFn({ llm }),
    });
  }

  it("runs the tool the local model chose and then its reply", async () => {
    const execute = vi.fn();
    const { llm } = _createScriptedLlm([
      '{"action":"echo","args":{"word":"hi"}}',
      '{"action":"reply","text":"I echoed hi."}',
    ]);
    const agent = _createAgent(llm, execute);

    await agent.prompt("Echo hi");

    expect(execute).toHaveBeenCalledWith({ word: "hi" });
    const last = agent.state.messages.at(-1);
    expect(last?.role).toBe("assistant");
    expect(JSON.stringify(last)).toContain("I echoed hi.");
  });

  it("sends the prompt, the tool list, and the history as chat messages", async () => {
    const { llm, requests } = _createScriptedLlm([
      '{"action":"echo","args":{"word":"hi"}}',
    ]);
    const agent = _createAgent(llm);

    await agent.prompt("Echo hi");

    const second = requests[1]!;
    expect(second.modelId).toBe("Qwen3-4B-q4f16_1-MLC");
    expect(second.jsonSchema).toBeDefined();
    expect(second.messages[0]?.role).toBe("system");
    expect(second.messages[0]?.content).toContain("You help.");
    expect(second.messages[0]?.content).toContain("echo: Repeats a word.");
    expect(
      second.messages.slice(1).map((message) => {
        return [message.role, message.content];
      }),
    ).toEqual([
      ["user", "Echo hi"],
      ["assistant", '{"action":"echo","args":{"word":"hi"}}'],
      ["user", "Result of echo:\nechoed hi"],
    ]);
  });

  it("replays the model's own output so the runtime can reuse its cache", async () => {
    const rawOutput = '{\n  "action": "echo",\n  "args": { "word": "hi" }\n}';
    const { llm, requests } = _createScriptedLlm([rawOutput]);
    const agent = _createAgent(llm);

    await agent.prompt("Echo hi");

    expect(requests[1]?.messages[2]).toEqual({
      role: "assistant",
      content: rawOutput,
    });
  });

  it("ends the turn with an error when the local model fails", async () => {
    const agent = _createAgent({
      complete: async () => {
        throw new Error("GPU lost");
      },
    });

    await agent.prompt("Echo hi");

    const last = agent.state.messages.at(-1) as { errorMessage?: string };
    expect(last.errorMessage).toContain("GPU lost");
  });
});
