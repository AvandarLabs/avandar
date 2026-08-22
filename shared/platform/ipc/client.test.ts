import type { IpcBridge } from "$/platform/ipc/client.ts";
import type {
  ReplyEnvelope,
  RequestEnvelope,
} from "$/platform/ipc/envelopes.ts";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { __setIpcBridgeForTests, callIpc } from "$/platform/ipc/client.ts";
import { defineIpcContract } from "$/platform/ipc/contracts/defineIpcContract.ts";

describe("callIpc", () => {
  const sendMock = vi.fn();
  const onceMock = vi.fn();

  beforeEach(() => {
    __setIpcBridgeForTests({
      send: sendMock,
      once: onceMock,
    } satisfies IpcBridge);
  });

  afterEach(() => {
    sendMock.mockReset();
    onceMock.mockReset();
    __setIpcBridgeForTests(undefined);
  });

  it("sends a request with a unique id and resolves with the parsed response", async () => {
    const contract = defineIpcContract<{ a: number }, { b: number }>(
      "test.echo",
    );

    onceMock.mockImplementation(
      (_channel: string, cb: (msg: unknown) => void) => {
        Promise.resolve().then(() => {
          const sentEnvelope = sendMock.mock.calls[0]?.[1] as RequestEnvelope;
          cb({
            id: sentEnvelope.id,
            ok: true,
            result: { b: 42 },
          } satisfies ReplyEnvelope);
        });
      },
    );

    const result = await callIpc(contract, { a: 1 });
    expect(result).toEqual({ b: 42 });

    expect(sendMock).toHaveBeenCalledOnce();
    expect(sendMock).toHaveBeenCalledWith("test.echo", {
      id: expect.any(String) as unknown,
      payload: { a: 1 },
    });
    expect(onceMock).toHaveBeenCalledWith(
      "test.echo.reply",
      expect.any(Function),
    );
  });

  it("rejects when the server replies with ok: false", async () => {
    const contract = defineIpcContract<Record<string, never>, { ok: true }>(
      "test.fails",
    );

    onceMock.mockImplementation(
      (_channel: string, cb: (msg: unknown) => void) => {
        Promise.resolve().then(() => {
          const sentEnvelope = sendMock.mock.calls[0]?.[1] as RequestEnvelope;
          cb({
            id: sentEnvelope.id,
            ok: false,
            error: "boom",
          } satisfies ReplyEnvelope);
        });
      },
    );

    await expect(callIpc(contract, {})).rejects.toThrow(/boom/);
  });

  it("rejects on id mismatch (defensive: the bridge should guarantee one reply per id)", async () => {
    const contract = defineIpcContract<{ a: number }, { b: number }>(
      "test.mismatch",
    );

    onceMock.mockImplementation(
      (_channel: string, cb: (msg: unknown) => void) => {
        Promise.resolve().then(() => {
          cb({
            id: "some-other-id",
            ok: true,
            result: { b: 99 },
          } satisfies ReplyEnvelope);
        });
      },
    );

    await expect(callIpc(contract, { a: 1 })).rejects.toThrow(/id mismatch/i);
  });

  it("throws synchronously when no IPC bridge is available", async () => {
    __setIpcBridgeForTests(undefined);
    const contract = defineIpcContract<Record<string, never>, { ok: true }>(
      "test.no-bridge",
    );

    await expect(callIpc(contract, {})).rejects.toThrow(
      /Electrobun IPC bridge not available/,
    );
  });
});
