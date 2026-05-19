import { callIpc } from "$/platform/ipc/client.ts";
import { ServerApiContracts } from "$/platform/ipc/contracts/ServerApiContracts.ts";
import type {
  ServerApiClient,
  ServerApiFunctionRequest,
} from "$/platform/types/ServerApiClient.types.ts";

/**
 * Desktop-side {@link ServerApiClient} that forwards every call to the
 * Bun-main `serverApi.*` IPC handlers in
 * `apps/desktop/main/ipc/registerServerApiHandlers/`. The Bun-main
 * process is the sole network egress on desktop — the auth token, the
 * Supabase URL, and any retry policy live there, not in the webview.
 *
 * Phase 2 makes this the live desktop implementation; previously
 * `createServerApiClient.ts` fell through to the browser-backed adapter
 * on both platforms because this file threw.
 *
 * @returns A {@link ServerApiClient} that issues IPC calls.
 */
export function createIpcServerApiClient(): ServerApiClient {
  return {
    async rpc<TResult = unknown>(
      name: string,
      args?: Readonly<Record<string, unknown>>,
    ): Promise<TResult> {
      const reply = await callIpc(ServerApiContracts.rpc, {
        name,
        args: args ?? {},
      });
      return reply as TResult;
    },

    async invokeFunction<TResult = unknown>(
      request: ServerApiFunctionRequest,
    ): Promise<TResult> {
      const reply = await callIpc(ServerApiContracts.invokeFunction, {
        route: request.route,
        method: request.method,
        pathParams: request.pathParams as
          | Record<string, string | number>
          | undefined,
        queryParams: request.queryParams as
          | Record<string, unknown>
          | undefined,
        body: request.body,
      });
      /*
       * The Bun-main handler returns `{ data, status }`. The
       * platform-level interface narrows the return to `TResult`, so
       * callers that need the HTTP status code have to plumb it
       * separately (web's `invokeFunction` likewise returns just
       * `data`). Match that shape here.
       */
      return reply.data as TResult;
    },
  };
}
