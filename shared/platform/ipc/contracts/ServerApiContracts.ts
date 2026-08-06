import { defineIpcContract } from "$/platform/ipc/contracts/defineIpcContract.ts";

/**
 * Server-side API contracts (Supabase RPCs + Edge Functions). The IPC layer
 * is intentionally loose (`unknown` in / `unknown` out); the typed
 * `ServerApiClient` interface in `@avandar/clients` enforces the per-RPC
 * shapes one level up. The Bun-main handler lives in
 * `apps/desktop/main/ipc/api.ts` (Phase 2 Task 14).
 */
export const ServerApiContracts = {
  rpc: defineIpcContract<{ name: string; args: unknown }, unknown>(
    "serverApi.rpc",
  ),
  invokeFunction: defineIpcContract<
    {
      route: string;
      method: string;
      pathParams?: Record<string, string | number>;
      queryParams?: Record<string, unknown>;
      body?: unknown;
    },
    { data: unknown; status: number }
  >("serverApi.invokeFunction"),
} as const;
