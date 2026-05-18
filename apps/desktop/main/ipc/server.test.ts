import { defineIpcContract } from "$/platform/ipc/contracts/defineIpcContract";
import { describe, expect, it, vi } from "vitest";
import { createIpcServer } from "./server";
import type { IpcTransport } from "./server";
import type { RequestEnvelope } from "$/platform/ipc/envelopes";

function makeFakeTransport(): {
  transport: IpcTransport;
  inbox: Record<string, (message: unknown) => void>;
  send: ReturnType<typeof vi.fn>;
} {
  const inbox: Record<string, (message: unknown) => void> = {};
  const send = vi.fn();
  const transport: IpcTransport = {
    on: (channel, callback) => {
      inbox[channel] = callback;
    },
    send,
  };
  return { transport, inbox, send };
}

describe("createIpcServer", () => {
  it("dispatches a registered handler and replies with the result", async () => {
    const { transport, inbox, send } = makeFakeTransport();
    const server = createIpcServer(transport);

    const contract = defineIpcContract<{ a: number }, { b: number }>(
      "test.double",
    );
    server.handle(contract, (req) => {
      return { b: req.a * 2 };
    });

    inbox["test.double"]?.({
      id: "req-1",
      payload: { a: 5 },
    } satisfies RequestEnvelope);
    await flushMicrotasks();

    expect(send).toHaveBeenCalledWith("test.double.reply", {
      id: "req-1",
      ok: true,
      result: { b: 10 },
    });
  });

  it("awaits async handlers before replying", async () => {
    const { transport, inbox, send } = makeFakeTransport();
    const server = createIpcServer(transport);

    const contract = defineIpcContract<{ a: number }, { b: number }>(
      "test.asyncDouble",
    );
    server.handle(contract, async (req) => {
      await Promise.resolve();
      return { b: req.a * 2 };
    });

    inbox["test.asyncDouble"]?.({
      id: "req-2",
      payload: { a: 7 },
    } satisfies RequestEnvelope);
    await flushMicrotasks();

    expect(send).toHaveBeenCalledWith("test.asyncDouble.reply", {
      id: "req-2",
      ok: true,
      result: { b: 14 },
    });
  });

  it("replies with ok: false when the handler throws an Error", async () => {
    const { transport, inbox, send } = makeFakeTransport();
    const server = createIpcServer(transport);

    const contract = defineIpcContract<Record<string, never>, { ok: true }>(
      "test.boom",
    );
    server.handle(contract, () => {
      throw new Error("nope");
    });

    inbox["test.boom"]?.({
      id: "req-3",
      payload: {},
    } satisfies RequestEnvelope);
    await flushMicrotasks();

    expect(send).toHaveBeenCalledWith("test.boom.reply", {
      id: "req-3",
      ok: false,
      error: "nope",
    });
  });

  it("serialises non-Error throws via String() so the reply still arrives", async () => {
    const { transport, inbox, send } = makeFakeTransport();
    const server = createIpcServer(transport);

    const contract = defineIpcContract<Record<string, never>, { ok: true }>(
      "test.stringThrow",
    );
    server.handle(contract, () => {
      throw "raw string";
    });

    inbox["test.stringThrow"]?.({
      id: "req-4",
      payload: {},
    } satisfies RequestEnvelope);
    await flushMicrotasks();

    expect(send).toHaveBeenCalledWith("test.stringThrow.reply", {
      id: "req-4",
      ok: false,
      error: "raw string",
    });
  });

  it("loopback: a contract round-trips through paired client and server transports", async () => {
    // Pair-wire client.send -> server.on and server.send -> client.once so a
    // real callIpc can hit a real createIpcServer in-process. This is the
    // symmetry guard against channel-name drift between the two sides.
    const serverInbox: Record<string, (message: unknown) => void> = {};
    const clientInbox: Record<string, (message: unknown) => void> = {};

    const serverTransport: IpcTransport = {
      on: (channel, callback) => {
        serverInbox[channel] = callback;
      },
      send: (channel, message) => {
        clientInbox[channel]?.(message);
      },
    };

    const server = createIpcServer(serverTransport);
    const contract = defineIpcContract<{ n: number }, { doubled: number }>(
      "loopback.double",
    );
    server.handle(contract, (req) => {
      return { doubled: req.n * 2 };
    });

    const { callIpc, __setIpcBridgeForTests } =
      await import("$/platform/ipc/client");
    __setIpcBridgeForTests({
      send: (channel, message) => {
        serverInbox[channel]?.(message);
      },
      once: (channel, callback) => {
        clientInbox[channel] = callback;
      },
    });

    try {
      const result = await callIpc(contract, { n: 21 });
      expect(result).toEqual({ doubled: 42 });
    } finally {
      __setIpcBridgeForTests(undefined);
    }
  });
});

async function flushMicrotasks(): Promise<void> {
  // Four ticks covers async handlers that themselves await once before
  // returning: dispatch.then -> handler() -> handler's internal await ->
  // result.then(send). Sync handlers settle in fewer ticks but tolerate
  // the extras.
  for (let i = 0; i < 4; i += 1) {
    await Promise.resolve();
  }
}
