/**
 * The agent proxy speaks the wire format of Pi's `streamProxy` client. These
 * tests stream scripted model output through `toProxyEvent` over a real HTTP
 * server and read it back with that client, so a drift in either side shows
 * up as a broken message rather than a silent mismatch.
 */
import { createServer } from "node:http";
import { streamProxy } from "@earendil-works/pi-agent-core";
import {
  createModels,
  fauxAssistantMessage,
  fauxProvider,
  fauxText,
  fauxToolCall,
  normalizeContext,
} from "@earendil-works/pi-ai";
import { toProxyEvent } from "@sbfn/chat/PostAgentStream/toProxyEvent.ts";
import { afterEach, describe, expect, it } from "vitest";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";

const faux = fauxProvider();
const models = createModels();
models.setProvider(faux.provider);
const model = faux.getModel();
const context = normalizeContext({
  messages: [{ role: "user", content: "How many?", timestamp: 0 }],
});

let server: Server | undefined;

async function _startProxyServer(): Promise<string> {
  server = createServer(async (_request, response) => {
    response.writeHead(200, { "Content-Type": "text/event-stream" });
    for await (const event of models.streamSimple(model, context)) {
      const proxyEvent = toProxyEvent(event);
      if (proxyEvent) {
        response.write(`data: ${JSON.stringify(proxyEvent)}\n\n`);
      }
    }
    response.end();
  });
  await new Promise<void>((resolve) => {
    server!.listen(0, resolve);
  });
  return `http://127.0.0.1:${(server!.address() as AddressInfo).port}`;
}

afterEach(() => {
  server?.close();
});

describe("toProxyEvent", () => {
  it("lets Pi's proxy client rebuild a tool call and its arguments", async () => {
    faux.setResponses([
      fauxAssistantMessage(
        [fauxToolCall("run_query", { sql: "SELECT 1", summary: "One row." })],
        { stopReason: "toolUse" },
      ),
    ]);
    const proxyUrl = await _startProxyServer();

    const message = await streamProxy(model, context, {
      authToken: "token",
      proxyUrl,
    }).result();

    expect(message.stopReason).toBe("toolUse");
    expect(message.content).toMatchObject([
      {
        type: "toolCall",
        name: "run_query",
        arguments: { sql: "SELECT 1", summary: "One row." },
      },
    ]);
  });

  it("lets Pi's proxy client rebuild streamed text and its usage", async () => {
    faux.setResponses([fauxAssistantMessage([fauxText("Here you go.")])]);
    const proxyUrl = await _startProxyServer();

    const message = await streamProxy(model, context, {
      authToken: "token",
      proxyUrl,
    }).result();

    expect(message.stopReason).toBe("stop");
    expect(message.content).toMatchObject([
      { type: "text", text: "Here you go." },
    ]);
    expect(message.usage.output).toBeGreaterThan(0);
  });
});
