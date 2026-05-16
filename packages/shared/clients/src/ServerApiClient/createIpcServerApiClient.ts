import type { ServerApiClient } from "$/platform";

/**
 * Phase 1 stub for the desktop-side {@link ServerApiClient}.
 *
 * Phase 2 replaces this with the real IPC-backed implementation that bridges
 * RPC calls and Edge Function invocations from the webview through the Bun
 * main process. The Phase 1 desktop shell never reaches this code path
 * because `createServerApiClient` falls through to the browser-backed
 * adapter when running under the desktop webview pointed at the local Vite
 * server.
 *
 * @returns Never — always throws to surface accidental Phase-1 desktop usage.
 * @throws Error sentinel `"desktop ServerApiClient lands in Phase 2"`.
 */
export function createIpcServerApiClient(): ServerApiClient {
  throw new Error("desktop ServerApiClient lands in Phase 2");
}
