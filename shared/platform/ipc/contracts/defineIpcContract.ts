/*
 * IPC contract framework.
 *
 * Lives in `shared/` because the React import chain transitively reaches
 * it. On desktop the platform-aware factories (`createRdbCrudClient`,
 * `createServerApiClient`, plus the `Desktop*` adapters under
 * `shared/platform/desktop/`) resolve to implementations that call
 * `callIpc` with one of the contract namespaces in this directory. On web
 * those same factory files still pull the namespaces in via static imports
 * (the desktop branch is dead at runtime but live in the bundle's import
 * graph). Either way the React code is the importer, so the contract
 * definitions live where React can reach them.
 *
 * The Bun-main side of each contract is registered from
 * `apps/desktop/main/ipc/*.ts`; it imports the same namespaces from here so
 * the channel name and request/response types stay in lock-step across the
 * wire.
 *
 * Real native work (opening connections, running queries, reading files)
 * lives in `apps/desktop/main/services/`. The contracts here are purely the
 * wire-level agreement.
 */

/**
 * A typed IPC contract. Carries the channel `name` plus phantom `__request`
 * and `__response` slots that the {@link defineIpcContract} factory uses to
 * thread request and response types from the declaration site to every
 * `callIpc` and `IpcServer.handle` call site.
 *
 * `parseRequest` and `parseResponse` are identity casts in Phase 2; they
 * exist so a future runtime validator (e.g. a `zod` schema) can be dropped
 * in without changing call sites.
 */
export type IpcContract<TRequest, TResponse> = {
  name: string;
  parseRequest: (raw: unknown) => TRequest;
  parseResponse: (raw: unknown) => TResponse;
  __request: TRequest;
  __response: TResponse;
};

/**
 * Define a typed IPC contract. The returned handle is the single source of
 * truth for the channel name and the request/response shapes shared between
 * the webview-side `callIpc` and the Bun-main `IpcServer.handle`.
 *
 * @param name - Stable channel identifier (e.g. `"rdb.run"`). Must be unique
 *   across the entire IPC surface; the per-service namespace files in this
 *   directory (`RdbContracts.ts`, `DuckDbContracts.ts`, etc.) partition the
 *   namespace by service.
 * @returns A typed {@link IpcContract} handle.
 */
export function defineIpcContract<TRequest, TResponse>(
  name: string,
): IpcContract<TRequest, TResponse> {
  return {
    name,
    parseRequest: (raw: unknown): TRequest => {
      return raw as TRequest;
    },
    parseResponse: (raw: unknown): TResponse => {
      return raw as TResponse;
    },
    __request: undefined as unknown as TRequest,
    __response: undefined as unknown as TResponse,
  };
}
