import { Logger } from "$/lib/Logger/Logger";
import { unknownToString } from "$/lib/utils/strings/unknownToString";
import {
  buildHTTPQueryString as _buildHTTPQueryString,
  ValidURLQueryParamValue,
} from "$/utils/urls/buildHTTPQueryString";
import { Simplify } from "type-fest";
import { AvaSupabase } from "@/db/supabase/AvaSupabase";
import { HTTPMethod } from "../../supabase/functions/_shared/MiniServer/api.types";
import type {
  API,
  APIBody,
  APIPathParams,
  APIQueryParams,
  APIReturnType,
} from "@/types/http-api.types";

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

function _buildURLWithPathParams(
  route: string,
  pathParams?: Record<string, string | number>,
): string {
  if (pathParams === undefined) {
    return route;
  }

  return route.replace(/:([a-zA-Z0-9_]+)/g, (_, paramName) => {
    if (pathParams[paramName]) {
      return String(pathParams[paramName]);
    }
    const errMsg = `Could not build a URL for ${route}. No parameter was passed in for '${paramName}'`;
    Logger.error(errMsg, { route, pathParams: pathParams });
    throw new Error(errMsg);
  });
}

function _buildRelativeAPIURL<
  Route extends keyof API,
  Method extends HTTPMethod,
>(
  options: Pick<
    HTTPRequestOptions<Route, Method>,
    "route" | "pathParams" | "queryParams"
  >,
): string {
  const { route, pathParams, queryParams } = options;
  const newRoutePath = _buildURLWithPathParams(route, pathParams);
  if (newRoutePath.includes(":")) {
    // if there is still a colon in the URL, it means we didn't find a path
    // param
    const errMsg = `Could not build a URL for ${route}. Not all path parameters were replaced.`;
    Logger.error(errMsg, { route, pathParams });
    throw new Error(errMsg);
  }
  const queryString =
    queryParams ? _buildHTTPQueryString(queryParams) : undefined;
  return queryString === undefined ? newRoutePath : (
      `${newRoutePath}?${queryString}`
    );
}

async function sendHTTPRequest<
  Route extends keyof API,
  Method extends HTTPMethod,
>(
  options: HTTPRequestOptions<Route, Method>,
): Promise<APIReturnType<Route, Method>> {
  const { method, body } = options;
  const relativeAPIURL = _buildRelativeAPIURL(options);
  const { data, error } = await AvaSupabase.DB.functions.invoke<
    APIReturnType<Route, Method>
  >(relativeAPIURL, {
    method,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (data) {
    return data;
  }

  const errorContext = error?.context;
  if (errorContext instanceof Response) {
    const errorResponse = await errorContext.json();
    if (
      errorResponse &&
      typeof errorResponse === "object" &&
      "error" in errorResponse
    ) {
      throw new Error(unknownToString(errorResponse.error));
    }
  }

  throw error ? error : new Error("No data returned");
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
