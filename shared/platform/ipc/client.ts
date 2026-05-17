/*
 * Webview-side IPC caller.
 *
 * Lives in `shared/` for the same reason the contract definitions do: the
 * React import chain transitively reaches it on every platform. Concretely,
 * `createSqliteCrudClient`, `createIpcServerApiClient`, and the `Desktop*`
 * adapters under `shared/platform/desktop/` all call `callIpc`, and they
 * are themselves statically imported by platform-aware factories that the
 * React tree (`src/`) consumes. On web those imports are dead at runtime
 * (the `isDesktop()` gate is false) but live in the bundle's import graph;
 * on desktop the same imports become the active code path.
 *
 * The Bun-main counterpart is `apps/desktop/main/ipc/server.ts` plus the
 * service-specific handler files under `apps/desktop/main/ipc/`. Nothing
 * webview-side imports those.
 */

import type { IpcContract } from "$/platform/ipc/contracts/defineIpcContract.ts";

/**
 * Minimal IPC bridge surface that the webview-side {@link callIpc} consumes.
 * Real desktop builds populate `globalThis.electrobun` with this shape;
 * tests inject a fake via {@link __setIpcBridgeForTests}.
 */
export type IpcBridge = {
  send: (channel: string, message: unknown) => void;
  once: (channel: string, callback: (message: unknown) => void) => void;
};

type RequestEnvelope = {
  id: string;
  payload: unknown;
};

type ReplyEnvelope = {
  id: string;
  ok: boolean;
  result?: unknown;
  error?: string;
};

let bridge: IpcBridge | undefined;

function getBridge(): IpcBridge {
  if (bridge !== undefined) {
    return bridge;
  }
  const fromGlobal = (globalThis as { electrobun?: IpcBridge }).electrobun;
  if (fromGlobal === undefined) {
    throw new Error(
      "Electrobun IPC bridge not available: callIpc may only be used inside the desktop webview",
    );
  }
  bridge = fromGlobal;
  return bridge;
}

/**
 * Test-only seam for injecting a fake IPC bridge. Pass `undefined` to reset
 * to the default `globalThis.electrobun` lookup. Do not call from app code.
 *
 * @param testBridge - The bridge implementation to install, or `undefined`
 *   to reset.
 */
export function __setIpcBridgeForTests(
  testBridge: Readonly<IpcBridge> | undefined,
): void {
  bridge = testBridge;
}

let nextRequestSequence = 1;

function makeRequestId(): string {
  const sequence = nextRequestSequence;
  nextRequestSequence += 1;
  return `${Date.now()}-${sequence}`;
}

/**
 * Issue a typed IPC request through the Electrobun bridge and resolve with
 * the parsed response. Sends a request envelope on `contract.name` and
 * listens once on `${contract.name}.reply` for a matching reply envelope.
 *
 * @param contract - The shared {@link IpcContract} declaring the channel and
 *   the request/response shapes. Both the client and the server import the
 *   same contract object, which is what enforces symmetry across the wire.
 * @param request - The request payload, typed by the contract.
 * @returns A promise resolving to the response payload, typed by the
 *   contract. Rejects when the server replies with `ok: false`, when the
 *   reply id does not match the request id, or when no IPC bridge is
 *   available.
 */
export function callIpc<TRequest, TResponse>(
  contract: Readonly<IpcContract<TRequest, TResponse>>,
  request: Readonly<TRequest>,
): Promise<TResponse> {
  return new Promise<TResponse>((resolve, reject) => {
    let activeBridge: IpcBridge;
    try {
      activeBridge = getBridge();
    } catch (err) {
      reject(err instanceof Error ? err : new Error(String(err)));
      return;
    }

    const requestId = makeRequestId();
    const replyChannel = `${contract.name}.reply`;

    activeBridge.once(replyChannel, (raw: unknown) => {
      const reply = raw as ReplyEnvelope;
      if (reply.id !== requestId) {
        reject(
          new Error(
            `IPC reply id mismatch on ${contract.name}: expected ${requestId}, got ${reply.id}`,
          ),
        );
        return;
      }
      if (reply.ok) {
        resolve(contract.parseResponse(reply.result));
        return;
      }
      reject(new Error(reply.error ?? `${contract.name} failed`));
    });

    const envelope: RequestEnvelope = { id: requestId, payload: request };
    activeBridge.send(contract.name, envelope);
  });
}
