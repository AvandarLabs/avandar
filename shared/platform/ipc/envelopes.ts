/*
 * Wire envelopes shared by every IPC contract: how the webview-side
 * `callIpc` frames a request and how the Bun-main `IpcServer` frames
 * a reply. Both sides import from here so the shape stays in lock-step
 * across the bridge. Tests also import from here instead of redeclaring
 * matching shapes locally.
 */

/**
 * A request frame written by the webview-side `callIpc`. The Bun-main
 * `IpcServer` deserialises this and dispatches to the registered
 * handler.
 */
export type RequestEnvelope = {
  id: string;
  payload: unknown;
};

/**
 * A reply frame written by the Bun-main `IpcServer`. `ok` discriminates
 * success vs failure; on success `result` carries the response payload,
 * on failure `error` carries the message string.
 */
export type ReplyEnvelope = {
  id: string;
  ok: boolean;
  result?: unknown;
  error?: string;
};
