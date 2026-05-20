import { createBrowserServerApiClient } from "@clients/ServerApiClient/createBrowserServerApiClient.ts";
import { createIpcServerApiClient } from "@clients/ServerApiClient/createIpcServerApiClient.ts";
import { isDesktop } from "$/platform/isDesktop.ts";
import type { ServerApiClient } from "$/platform/types/ServerApiClient.types.ts";

/**
 * Platform-aware {@link ServerApiClient} factory. On desktop the IPC
 * adapter routes calls through the Bun-main `serverApi.*` handlers;
 * on web it delegates to the existing `@supabase/supabase-js` instance.
 *
 * @returns A {@link ServerApiClient} appropriate to the current platform.
 */
export function createServerApiClient(): ServerApiClient {
  if (isDesktop()) {
    return createIpcServerApiClient();
  }
  return createBrowserServerApiClient();
}
