import type { IpcServer } from "../createIpcServer/createIpcServer";
import type { AuthState } from "../registerAuthHandlers/registerAuthHandlers";

import { ServerApiContracts } from "../../../../../shared/platform/ipc/contracts/ServerApiContracts";

/*
 * Bun-main implementation of the Supabase server-API surface (PostgREST
 * RPCs + Edge Functions). The webview's `createIpcServerApiClient`
 * forwards every call here so all network egress from the desktop
 * binary flows through a single, observable code path: the spec's
 * "single network egress" invariant.
 *
 * The handler reads the current access token off the shared
 * {@link AuthState} object the auth IPC handler mutates, so a token
 * refresh in the auth path is immediately visible here without an
 * explicit hand-off.
 */

/**
 * Config for {@link registerServerApiHandlers}. The Supabase URL and
 * anon key come from `VITE_SUPABASE_API_URL` / `VITE_SUPABASE_ANON_KEY`
 * in the boot env; passing them explicitly here makes the handler
 * unit-testable.
 */
export type ServerApiHandlerOptions = {
  supabaseUrl: string;
  supabaseAnonKey: string;
  authState: AuthState;
  /**
   * Injection seam: defaults to `globalThis.fetch` (Bun's native).
   * The integration test passes a fake to capture request shape.
   */
  fetchImpl?: typeof fetch;
};

function _interpolateRoute(
  route: string,
  pathParams: Record<string, string | number> | undefined,
): string {
  if (pathParams === undefined) {
    if (route.includes(":")) {
      throw new Error(
        `serverApi.invokeFunction: route ${route} has placeholders but no pathParams provided`,
      );
    }
    return route;
  }
  const interpolated = route.replace(
    /:([a-zA-Z0-9_]+)/g,
    (_match, name: string) => {
      const value = pathParams[name];
      if (value === undefined || value === null) {
        throw new Error(
          `serverApi.invokeFunction: missing path param '${name}' for route '${route}'`,
        );
      }
      return encodeURIComponent(String(value));
    },
  );
  if (interpolated.includes(":")) {
    throw new Error(
      `serverApi.invokeFunction: not all path params substituted for route '${route}'`,
    );
  }
  return interpolated;
}

function _buildQueryString(
  queryParams: Record<string, unknown> | undefined,
): string {
  if (queryParams === undefined) {
    return "";
  }
  const pairs = Object.entries(queryParams)
    .filter(([, value]) => {
      return value !== undefined && value !== null;
    })
    .map(([key, value]) => {
      if (Array.isArray(value)) {
        return `${encodeURIComponent(key)}=${encodeURIComponent(value.join(";"))}`;
      }
      return `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`;
    });
  if (pairs.length === 0) {
    return "";
  }
  return `?${pairs.join("&")}`;
}

/**
 * Wires the `serverApi.rpc` and `serverApi.invokeFunction` IPC
 * handlers into `server`. Both handlers build their requests
 * server-side and inject the current access token from
 * {@link AuthState} as a `Bearer` header: the webview never sees the
 * token unless it asks the auth handler explicitly.
 *
 * @param server - The IPC server from `createIpcServer`.
 * @param options - Supabase URL + anon key + shared auth state +
 *   optional `fetchImpl` seam for tests.
 */
export function registerServerApiHandlers(
  server: IpcServer,
  options: Readonly<ServerApiHandlerOptions>,
): void {
  const fetchImpl = options.fetchImpl ?? fetch;
  const { supabaseUrl, supabaseAnonKey, authState } = options;

  function buildAuthHeaders(): Record<string, string> {
    const accessToken = authState.accessToken?.token;
    return {
      apikey: supabaseAnonKey,
      "Content-Type": "application/json",
      ...(accessToken !== undefined
        ? { Authorization: `Bearer ${accessToken}` }
        : {}),
    };
  }

  server.handle(ServerApiContracts.rpc, async (req) => {
    const url = `${supabaseUrl}/rest/v1/rpc/${encodeURIComponent(req.name)}`;
    const response = await fetchImpl(url, {
      method: "POST",
      headers: buildAuthHeaders(),
      body: JSON.stringify(req.args ?? {}),
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(
        `serverApi.rpc('${req.name}') failed: ${response.status} ${text}`,
      );
    }
    const text = await response.text();
    if (text.length === 0) {
      return null;
    }
    return JSON.parse(text) as unknown;
  });

  server.handle(ServerApiContracts.invokeFunction, async (req) => {
    const interpolated = _interpolateRoute(req.route, req.pathParams);
    const query = _buildQueryString(req.queryParams);
    const url = `${supabaseUrl}/functions/v1/${interpolated}${query}`;
    const hasBody =
      req.method !== "GET" && req.method !== "DELETE" && req.body !== undefined;
    const response = await fetchImpl(url, {
      method: req.method,
      headers: buildAuthHeaders(),
      body: hasBody ? JSON.stringify(req.body) : undefined,
    });
    const text = await response.text();
    const data = text.length === 0 ? null : (JSON.parse(text) as unknown);
    if (!response.ok) {
      throw new Error(
        `serverApi.invokeFunction('${req.route}') failed: ${response.status} ${text}`,
      );
    }
    return { data, status: response.status };
  });
}
