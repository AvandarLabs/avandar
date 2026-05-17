/*
 * Bun-main IPC server. Lives in `apps/desktop/` because nothing else can or
 * should import it: the React webview never reaches this file, and the
 * Electrobun transport surface it consumes (`{on, send}` against the
 * webview's IPC channels) only exists in the Bun main process. The
 * service-specific handler files in this directory (`rdb.ts`, `duckdb.ts`,
 * `dataset-blob.ts`, `auth.ts`, `api.ts`) all call into the `IpcServer`
 * built here and register handlers against the contract namespaces shared
 * from `shared/platform/ipc/contracts/`.
 */

import type { IpcContract } from "$/platform/ipc/contracts/defineIpcContract";

/**
 * Minimal transport surface that {@link createIpcServer} needs from
 * Electrobun's Bun-main API. Adapter code in `apps/desktop/main/index.ts`
 * (Phase 2 Task 8) wires the real webview IPC channels into this shape.
 */
export type IpcTransport = {
  on: (channel: string, callback: (message: unknown) => void) => void;
  send: (channel: string, message: unknown) => void;
};

/**
 * Bun-main side of a typed IPC contract. Each `handle` call registers a
 * handler for the contract's channel and ensures every incoming request
 * produces exactly one reply on `${contract.name}.reply`, even when the
 * handler throws.
 */
export type IpcServer = {
  handle<TRequest, TResponse>(
    contract: Readonly<IpcContract<TRequest, TResponse>>,
    handler: (request: TRequest) => Promise<TResponse> | TResponse,
  ): void;
};

type RequestEnvelope = {
  id: string;
  payload: unknown;
};

/**
 * Build a typed IPC server bound to the given Electrobun transport. The
 * returned object's `handle` method registers contract-specific handlers
 * and is the only public surface; the dispatch loop, reply envelope shape,
 * and error serialisation are encapsulated here so the webview-side
 * `callIpc` and Bun-main handlers stay symmetric without ad-hoc glue.
 *
 * @param transport - The transport adapter that bridges Electrobun's IPC
 *   primitives into the `{on, send}` shape this server consumes.
 * @returns An {@link IpcServer} ready to register typed handlers on.
 */
export function createIpcServer(transport: Readonly<IpcTransport>): IpcServer {
  return {
    handle<TRequest, TResponse>(
      contract: Readonly<IpcContract<TRequest, TResponse>>,
      handler: (request: TRequest) => Promise<TResponse> | TResponse,
    ): void {
      const replyChannel = `${contract.name}.reply`;
      transport.on(contract.name, (raw: unknown) => {
        const envelope = raw as RequestEnvelope;
        Promise.resolve()
          .then(() => {
            return handler(contract.parseRequest(envelope.payload));
          })
          .then((result) => {
            transport.send(replyChannel, {
              id: envelope.id,
              ok: true,
              result,
            });
          })
          .catch((err: unknown) => {
            const error = err instanceof Error ? err.message : String(err);
            transport.send(replyChannel, {
              id: envelope.id,
              ok: false,
              error,
            });
          });
      });
    },
  };
}
