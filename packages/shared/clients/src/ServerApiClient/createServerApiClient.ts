import { isDesktop } from "$/platform";
import type { ServerApiClient } from "$/platform";
import { createBrowserServerApiClient } from "./createBrowserServerApiClient.ts";
import { createIpcServerApiClient } from "./createIpcServerApiClient.ts";

/**
 * Platform-aware {@link ServerApiClient} factory.
 *
 * Phase 1 (Option A): both web and desktop return the browser-backed adapter
 * so the desktop shell, which currently runs the entire web stack inside a
 * webview pointed at the Vite dev server, keeps working without surfacing the
 * "desktop ServerApiClient lands in Phase 2" sentinel from
 * {@link createIpcServerApiClient}.
 *
 * Phase 2 introduces the IPC-backed branch — at that point this factory
 * dispatches on {@link isDesktop} and the IPC adapter replaces the stub.
 *
 * @returns A {@link ServerApiClient} appropriate to the current platform.
 */
export function createServerApiClient(): ServerApiClient {
  // Phase 2 cutover: when the IPC adapter lands, this becomes:
  //   if (isDesktop()) return createIpcServerApiClient();
  void isDesktop;
  void createIpcServerApiClient;
  return createBrowserServerApiClient();
}
