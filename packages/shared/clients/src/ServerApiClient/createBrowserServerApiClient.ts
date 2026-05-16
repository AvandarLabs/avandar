import type {
  ServerApiClient,
  ServerApiFunctionRequest,
} from "$/platform/types/ServerApiClient.types.ts";
import { AvaSupabase } from "$/db/supabase/AvaSupabase.ts";

/**
 * Build the relative URL `supabase.functions.invoke` is called with.
 * Mirrors the path-param / query-string substitution `APIClient.ts` performs
 * today so this adapter is a behavior-preserving wrapper. Phase 2 may
 * centralize this builder; for now keeping it local keeps the
 * `packages/shared/` → `src/` boundary clean.
 */
function buildRelativeFunctionUrl(
  request: ServerApiFunctionRequest,
): string {
  const { route, pathParams, queryParams } = request;

  const interpolated =
    pathParams === undefined ?
      route
    : route.replace(/:([a-zA-Z0-9_]+)/g, (_, name: string) => {
        const value = pathParams[name];
        if (value === undefined || value === null) {
          throw new Error(
            `serverApi.invokeFunction: missing path param '${name}' for route '${route}'`,
          );
        }
        return encodeURIComponent(String(value));
      });

  if (interpolated.includes(":")) {
    throw new Error(
      `serverApi.invokeFunction: not all path params were substituted for route '${route}'`,
    );
  }

  if (queryParams === undefined) {
    return interpolated;
  }

  const search = Object.entries(queryParams)
    .filter(([, v]) => v !== undefined && v !== null)
    .flatMap(([k, v]) => {
      if (Array.isArray(v)) {
        return [`${encodeURIComponent(k)}=${encodeURIComponent(v.join(";"))}`];
      }
      return [`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`];
    })
    .join("&");

  return search.length === 0 ? interpolated : `${interpolated}?${search}`;
}

/**
 * Web-side {@link ServerApiClient}. Thin wrapper over the shared `AvaSupabase`
 * singleton — `rpc` is a direct passthrough; `invokeFunction` builds the
 * relative URL the same way `APIClient.sendHTTPRequest` does today and
 * delegates to `supabase.functions.invoke(...)`.
 *
 * Phase 2 may replace this with a more typed shim; the current goal is zero
 * behavior change on web while desktop migrates to its own IPC backend.
 *
 * @returns A browser-backed {@link ServerApiClient}.
 */
export function createBrowserServerApiClient(): ServerApiClient {
  return {
    async rpc<TResult = unknown>(
      name: string,
      args?: Readonly<Record<string, unknown>>,
    ): Promise<TResult> {
      const client = AvaSupabase.db();
      // Supabase's `.rpc()` signature is typed against the registered Database;
      // at this generic boundary we cast through `unknown` because the
      // platform-level interface deliberately keeps RPCs string-keyed.
      const { data, error } = await (
        client.rpc as unknown as (
          n: string,
          a: Record<string, unknown> | undefined,
        ) => Promise<{ data: unknown; error: { message: string } | null }>
      )(name, args ?? {});
      if (error) {
        throw new Error(`serverApi.rpc('${name}') failed: ${error.message}`);
      }
      return data as TResult;
    },

    async invokeFunction<TResult = unknown>(
      request: ServerApiFunctionRequest,
    ): Promise<TResult> {
      const client = AvaSupabase.db();
      const relativeUrl = buildRelativeFunctionUrl(request);
      const { data, error } = await client.functions.invoke(relativeUrl, {
        method: request.method,
        body: request.body as unknown as Record<string, unknown> | undefined,
      });
      if (error) {
        throw new Error(
          `serverApi.invokeFunction('${request.route}') failed: ${error.message}`,
        );
      }
      return data as TResult;
    },
  };
}
