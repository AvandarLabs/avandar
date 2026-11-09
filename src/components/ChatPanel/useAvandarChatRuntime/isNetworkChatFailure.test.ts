/**
 * The agent's model calls go through Pi's `streamProxy`, which never throws:
 * it records a failed request on the assistant message, and the data agent
 * rethrows it. These tests run that chain for real, with only `fetch`
 * stubbed, so a change to the proxy client's messages shows up here.
 */
import { streamProxy } from "@earendil-works/pi-agent-core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { isNetworkChatFailure } from "@/components/ChatPanel/useAvandarChatRuntime/isNetworkChatFailure";
import { createDataAgent } from "@/lib/agent/dataAgent/createDataAgent/createDataAgent";
import { createLocalModel } from "@/lib/agent/localModels/createLocalModelStreamFn/createLocalModelStreamFn";
import type { DataAgentHost } from "@/lib/agent/dataAgent/DataAgentHost";

const MODEL = createLocalModel({ id: "test", name: "test", contextWindow: 8 });

/** Asks a proxy-backed data agent once and returns what it threw. */
async function _askThroughProxy(): Promise<unknown> {
  const dataAgent = createDataAgent({
    datasets: [],
    host: {} as DataAgentHost,
    policy: { primary: { model: MODEL, thinkingLevel: "off" } },
    streamFn: (model, context, options) => {
      return streamProxy(model, context, {
        ...options,
        authToken: "token",
        proxyUrl: "https://example.test",
      });
    },
    today: "2026-11-08",
  });
  return dataAgent.ask("How many?").then(
    () => {
      return undefined;
    },
    (error: unknown) => {
      return error;
    },
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("isNetworkChatFailure", () => {
  it.each([
    ["Chrome", "Failed to fetch"],
    ["Safari", "Load failed"],
    ["Firefox", "NetworkError when attempting to fetch resource."],
  ])(
    "recognizes the agent's error when %s cannot reach the proxy",
    async (_browser, message) => {
      vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError(message)));

      const error = await _askThroughProxy();

      expect(error).toBeInstanceOf(Error);
      expect(isNetworkChatFailure(error)).toBe(true);
    },
  );

  it("does not treat the proxy refusing the request as a network failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 }),
        ),
    );

    const error = await _askThroughProxy();

    expect((error as Error).message).toBe("Proxy error: Forbidden");
    expect(isNetworkChatFailure(error)).toBe(false);
  });
});
