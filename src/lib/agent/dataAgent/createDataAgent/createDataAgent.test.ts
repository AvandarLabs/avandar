import { createAssistantMessageEventStream } from "@earendil-works/pi-ai";
import { describe, expect, it, vi } from "vitest";
import { createDataAgent } from "@/lib/agent/dataAgent/createDataAgent/createDataAgent";
import { createLocalModel } from "@/lib/agent/localModels/createLocalModelStreamFn/createLocalModelStreamFn";
import type { PluginAiToolDeclaration } from "$/agent/dataAgent/pluginAiTools.types";
import type { DataAgentHost } from "@/lib/agent/dataAgent/DataAgentHost";
import type { StreamFn } from "@earendil-works/pi-agent-core";
import type { AssistantMessage, StopReason } from "@earendil-works/pi-ai";

const MODEL = createLocalModel({ id: "test", name: "test", contextWindow: 8 });

const HOST: DataAgentHost = {
  showQuery: vi.fn(),
  readColumnValues: vi.fn(),
  askUser: vi.fn(),
  approveValuesForModel: vi.fn(),
};

/** A stream function whose every model call ends as `reason`. */
function _createEndingStreamFn(
  reason: Extract<StopReason, "error" | "aborted">,
  errorMessage?: string,
): StreamFn {
  return () => {
    const stream = createAssistantMessageEventStream();
    const message: AssistantMessage = {
      role: "assistant",
      content: [],
      api: MODEL.api,
      provider: MODEL.provider,
      model: MODEL.id,
      usage: {
        input: 0,
        output: 0,
        cacheRead: 0,
        cacheWrite: 0,
        totalTokens: 0,
        cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
      },
      stopReason: reason,
      errorMessage,
      timestamp: 0,
    };
    queueMicrotask(() => {
      stream.push({ type: "start", partial: message });
      stream.push({ type: "error", reason, error: message });
    });
    return stream;
  };
}

const OPTIONS = {
  datasets: [],
  host: HOST,
  policy: { primary: { model: MODEL, thinkingLevel: "off" as const } },
  today: "2026-11-08",
};

const STOP_STREAM = _createEndingStreamFn("aborted");

const FIT_DECLARATION: PluginAiToolDeclaration = {
  pluginId: "avandar.epidemiology",
  permissions: ["data:read"],
  name: "fitRegression",
  description: "Fits a line to two numeric columns.",
  parameters: {
    type: "object",
    additionalProperties: false,
    required: [],
    properties: {},
  },
};

function _createAgent(streamFn: StreamFn) {
  return createDataAgent({
    datasets: [],
    host: HOST,
    policy: { primary: { model: MODEL, thinkingLevel: "off" } },
    streamFn,
    today: "2026-11-08",
  });
}

describe("createDataAgent", () => {
  it("throws the model call's error when the request fails", async () => {
    const dataAgent = _createAgent(
      _createEndingStreamFn("error", "Failed to fetch"),
    );

    await expect(dataAgent.ask("How many?")).rejects.toThrow("Failed to fetch");
  });

  it("throws a general error when the failure has no message", async () => {
    const dataAgent = _createAgent(_createEndingStreamFn("error"));

    await expect(dataAgent.ask("How many?")).rejects.toThrow(
      "The assistant could not answer.",
    );
  });

  it("does not treat a stopped turn as a failure", async () => {
    const dataAgent = _createAgent(
      _createEndingStreamFn("aborted", "Request aborted by user"),
    );

    await expect(dataAgent.ask("How many?")).resolves.toMatchObject({
      text: "",
    });
  });

  it("adds the plugin tool on ask and leaves it off the plan tool list", async () => {
    let installedTools: readonly PluginAiToolDeclaration[] = [];
    const getPluginAiTools = vi.fn(() => {
      return installedTools;
    });
    const runPluginAiTool = vi
      .fn()
      .mockResolvedValue({ text: '{"slope":2}', isError: false });
    const agent = createDataAgent({
      ...OPTIONS,
      getPluginAiTools,
      runPluginAiTool,
      streamFn: STOP_STREAM,
    });
    // Installed after the agent exists, so only an ask-time read sees it.
    installedTools = [FIT_DECLARATION];
    await agent.ask("fit it");
    expect(getPluginAiTools).toHaveBeenCalled();
    expect(
      agent.agent.state.tools.map((tool) => {
        return tool.name;
      }),
    ).toContain("fitRegression");

    const planAgent = createDataAgent({
      ...OPTIONS,
      queryTools: "plan",
      getPluginAiTools,
      runPluginAiTool,
      streamFn: STOP_STREAM,
    });
    await planAgent.ask("fit it");
    expect(
      planAgent.agent.state.tools.map((tool) => {
        return tool.name;
      }),
    ).not.toContain("fitRegression");
  });
});
