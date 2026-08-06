import {
  ServerApiSessionRefresher,
  SessionExpiredError,
} from "@clients/ServerApiClient/ServerApiSessionRefresher.ts";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { AvaSupabase } from "$/db/supabase/AvaSupabase.ts";
import type {
  ServerApiClient,
  ServerApiFunctionRequest,
} from "$/platform/types/ServerApiClient.types.ts";

/**
 * Build the relative URL `supabase.functions.invoke` is called with.
 * Mirrors the path-param / query-string substitution `APIClient.ts` performs
 * today so this adapter is a behavior-preserving wrapper. Keeping it local
 * preserves the dependency boundary between `packages/shared/` and `src/`.
 */
function buildRelativeFunctionUrl(request: ServerApiFunctionRequest): string {
  const { route, pathParams, queryParams } = request;

  const interpolated =
    pathParams === undefined ? route : (
      route.replace(/:([a-zA-Z0-9_]+)/g, (_, name: string) => {
        const value = pathParams[name];
        if (value === undefined || value === null) {
          throw new Error(
            `serverApi.invokeFunction: missing path param '${name}' for route '${route}'`,
          );
        }
        return encodeURIComponent(String(value));
      })
    );

  if (interpolated.includes(":")) {
    throw new Error(
      `serverApi.invokeFunction: not all path params were substituted for route '${route}'`,
    );
  }

  if (queryParams === undefined) {
    return interpolated;
  }

  const search = Object.entries(queryParams)
    .filter(([, v]) => {
      return v !== undefined && v !== null;
    })
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
 * Whether a `supabase.functions.invoke` error is a `401 Unauthorized` from the
 * edge function. Only these are worth a session refresh; relay/fetch errors and
 * other status codes are not token problems.
 *
 * @param error - The error returned by `functions.invoke`.
 * @returns `true` if the error is an HTTP 401.
 */
function _isUnauthorized(error: unknown): boolean {
  return (
    error instanceof FunctionsHttpError &&
    (error.context as Response | undefined)?.status === 401
  );
}

/**
 * Web-side {@link ServerApiClient}. Thin wrapper over the shared `AvaSupabase`
 * singleton: `rpc` is a direct passthrough, and `invokeFunction` builds the
 * relative URL the same way `APIClient.sendHTTPRequest` does today and
 * delegates to `supabase.functions.invoke(...)`.
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

      const sendOnce = () => {
        return client.functions.invoke(relativeUrl, {
          method: request.method,
          body: request.body as unknown as Record<string, unknown> | undefined,
        });
      };

      let { data, error } = await sendOnce();

      // A 401 (and only a 401) may be a stale access token: one signed by a
      // retired JWT signing key. Refresh the session once (shared across all
      // concurrent 401s) and retry exactly once. Any other error, or a second
      // 401 after a fresh token, is not something a refresh can fix.
      if (_isUnauthorized(error)) {
        const session = await ServerApiSessionRefresher.refreshOnce();
        if (session === undefined) {
          throw new SessionExpiredError(request.route);
        }
        ({ data, error } = await sendOnce());
        if (_isUnauthorized(error)) {
          throw new SessionExpiredError(request.route);
        }
      }

      if (error) {
        throw new Error(
          `serverApi.invokeFunction('${request.route}') failed: ${error.message}`,
        );
      }
      return data as TResult;
    },
  };
}
