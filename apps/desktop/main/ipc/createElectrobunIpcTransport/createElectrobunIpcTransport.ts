/*
 * Bridge between Electrobun's BrowserView RPC (single-stream, schema-typed)
 * and the channel-keyed `IpcTransport` shape `createIpcServer` consumes.
 *
 * Each cross-process message is wrapped in an envelope:
 *
 *     { channel: "duckdb.runRawQuery", body: { ...payload } }
 *
 * The bun side uses Electrobun's wildcard message handler to receive any
 * message name without pre-declaring it in a schema, and uses
 * `webview.rpc.send.<name>(payload)` to broadcast. The webview side
 * (preload) bridges these messages via DOM `CustomEvent`s into the page
 * main world, where `globalThis.electrobun.{send, once}` lives.
 *
 * NOTE: This module touches Electrobun runtime internals
 * (`webview.rpc.send` / `addMessageListener("*", ...)`) and is not
 * unit-tested. Manual verification with `pnpm dev:desktop` is required
 * after wiring it up in `apps/desktop/main/index.ts`.
 */

import type { IpcTransport } from "../createIpcServer/createIpcServer";
import type { BrowserView } from "electrobun";

/*
 * The shape we install on Electrobun's `BrowserView.rpc`. We never call
 * any of these typed surfaces directly — the wildcard listener handles
 * incoming traffic and `rpc.send` is invoked via dynamic property
 * lookup. Casts in the implementation acknowledge that we're using
 * Electrobun's RPC layer in an intentionally untyped way.
 */
type ElectrobunRpcLike = {
  send: Record<string, (payload: unknown) => void>;
  addMessageListener: (
    name: "*",
    listener: (name: string, payload: unknown) => void,
  ) => void;
};

/**
 * Builds an {@link IpcTransport} that multiplexes channel-keyed messages
 * over a single Electrobun `BrowserView` RPC stream. The transport's
 * `send(channel, message)` calls `view.rpc.send[channel](message)` (the
 * webview-side wildcard handler picks it up), and `on(channel, callback)`
 * registers a listener in an in-process channel→handlers table that the
 * wildcard message listener dispatches into.
 *
 * @param view - The Electrobun `BrowserView` whose RPC stream should
 *   carry our IPC envelopes.
 * @returns An {@link IpcTransport} suitable for `createIpcServer`.
 */
export function createElectrobunIpcTransport(view: BrowserView): IpcTransport {
  const listeners = new Map<string, Array<(message: unknown) => void>>();
  const rpc = view.rpc as unknown as ElectrobunRpcLike;

  // Receive every message name without pre-declaring it in a schema.
  rpc.addMessageListener("*", (name: string, payload: unknown) => {
    const handlers = listeners.get(name);
    if (handlers === undefined) {
      return;
    }
    for (const handler of handlers) {
      handler(payload);
    }
  });

  return {
    on(channel, callback) {
      const list = listeners.get(channel) ?? [];
      list.push(callback);
      listeners.set(channel, list);
    },
    send(channel, message) {
      /*
       * Electrobun's `rpc.send` is a Proxy that resolves message names
       * lazily on dynamic property access (returns a sender function
       * for any name). The cast forces TS to acknowledge that.
       */
      const sender = rpc.send[channel] as
        | ((payload: unknown) => void)
        | undefined;
      if (sender !== undefined) {
        sender(message);
        return;
      }
      (rpc.send as Record<string, (payload: unknown) => void>)[channel]!(
        message,
      );
    },
  };
}
