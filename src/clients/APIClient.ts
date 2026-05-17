import { ValidURLQueryParamValue } from "$/utils/urls/buildHTTPQueryString";
import { Simplify } from "type-fest";
import { createServerApiClient } from "@clients";
import type {
  API,
  APIBody,
  APIPathParams,
  APIQueryParams,
  APIReturnType,
} from "@/types/http-api.types";
import type { HTTPMethod } from "@sbfn/_shared/MiniServer/api.types";

// Platform-aware server API client. On web this delegates to the registered
// Supabase client's `functions.invoke`; on desktop (Phase 2+) it bridges
// through Bun-main IPC. Module-scope singleton so all APIClient call sites
// share one instance. Path-param and query-string substitution that used to
// live in this file (the `_buildRelativeAPIURL` helper) now happens inside
// the ServerApiClient browser adapter — see
// `packages/shared/clients/src/ServerApiClient/createBrowserServerApiClient`.
const serverApi = createServerApiClient();

type HTTPRequestOptions<
  Route extends keyof API,
  Method extends HTTPMethod,
> = Simplify<
  {
    method: Method;
    route: Route;
    body?: APIBody<Route, Method>;
  } & (APIPathParams<Route, Method> extends Record<string, string | number> ?
    { pathParams: APIPathParams<Route, Method> }
  : { pathParams?: undefined }) &
    (APIQueryParams<Route, Method> extends (
      Record<string, ValidURLQueryParamValue>
    ) ?
      { queryParams: APIQueryParams<Route, Method> }
    : { queryParams?: undefined })
>;

async function sendHTTPRequest<
  Route extends keyof API,
  Method extends HTTPMethod,
>(
  options: HTTPRequestOptions<Route, Method>,
): Promise<APIReturnType<Route, Method>> {
  const { method, body, route } = options;
  // Delegate to the platform-aware ServerApiClient. The browser adapter does
  // the same `supabase.functions.invoke(...)` underneath; the desktop adapter
  // bridges through IPC in Phase 2. Path/query param substitution and the
  // error-shape unwrapping that previously lived here move into the adapter.
  return await serverApi.invokeFunction<APIReturnType<Route, Method>>({
    route: route as string,
    method: method as
      | "GET"
      | "POST"
      | "PATCH"
      | "PUT"
      | "DELETE",
    pathParams: (options as { pathParams?: Record<string, string | number> })
      .pathParams,
    queryParams: (options as { queryParams?: Record<string, unknown> })
      .queryParams,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

/**
 * HTTP client for making requests to our Supabase edge functions API.
 */
export const APIClient = {
  get: async <Route extends keyof API>(
    options: Omit<HTTPRequestOptions<Route, "GET">, "method">,
  ): Promise<APIReturnType<Route, "GET">> => {
    return await sendHTTPRequest({
      ...options,
      method: "GET",
    } as HTTPRequestOptions<Route, "GET">);
  },

  post: async <Route extends keyof API>(
    options: Omit<HTTPRequestOptions<Route, "POST">, "method">,
  ): Promise<APIReturnType<Route, "POST">> => {
    return await sendHTTPRequest({
      ...options,
      method: "POST",
      body: options.body ?? {},
    } as HTTPRequestOptions<Route, "POST">);
  },

  patch: async <Route extends keyof API>(
    options: Omit<HTTPRequestOptions<Route, "PATCH">, "method">,
  ): Promise<APIReturnType<Route, "PATCH">> => {
    return await sendHTTPRequest({
      ...options,
      method: "PATCH",
      body: options.body ?? {},
    } as HTTPRequestOptions<Route, "PATCH">);
  },

  put: async <Route extends keyof API>(
    options: Omit<HTTPRequestOptions<Route, "PUT">, "method">,
  ): Promise<APIReturnType<Route, "PUT">> => {
    return await sendHTTPRequest({
      ...options,
      method: "PUT",
      body: options.body ?? {},
    } as HTTPRequestOptions<Route, "PUT">);
  },

  delete: async <Route extends keyof API>(
    options: Omit<HTTPRequestOptions<Route, "DELETE">, "method">,
  ): Promise<APIReturnType<Route, "DELETE">> => {
    return await sendHTTPRequest({
      ...options,
      method: "DELETE",
      body: options.body ?? {},
    } as HTTPRequestOptions<Route, "DELETE">);
  },
};
