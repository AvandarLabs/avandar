import { AvaSupabase } from "@/db/supabase/AvaSupabase";
import { Logger } from "@/lib/Logger";
import { buildHTTPQueryString as _buildHTTPQueryString } from "@/lib/utils/buildHTTPQueryString";
import type { API } from "@/types/http-api.types";

type HTTPRequestOptions = {
  method: "GET" | "POST";
  urlParams?: Record<string, string>;
  queryParams?: Record<string, string | string[]>;
  body?: unknown;
};

function _buildURLWithPathParams(
  route: string,
  urlParams?: Record<string, string>,
): string {
  if (urlParams === undefined) {
    return route;
  }

  return route.replace(/:([a-zA-Z0-9_]+)/g, (_, paramName) => {
    if (urlParams[paramName]) {
      return urlParams[paramName];
    }
    const errMsg = `Could not build a URL for ${route}. No parameter was passed in for '${paramName}'`;
    Logger.error(errMsg, { route, pathParams: urlParams });
    throw new Error(errMsg);
  });
}

function _buildRelativeAPIURL<Route extends keyof API>(
  route: Route,
  options: Pick<HTTPRequestOptions, "urlParams" | "queryParams">,
): string {
  const { urlParams: pathParams, queryParams } = options;
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

async function sendHTTPRequest<Route extends keyof API>(
  route: Route,
  options: HTTPRequestOptions,
): Promise<API[Route]["returnType"]> {
  const { method, body } = options;
  const relativeAPIURL = _buildRelativeAPIURL(route, options);
  const { data, error } = await AvaSupabase.DB.functions.invoke<
    API[Route]["returnType"]
  >(relativeAPIURL, {
    method,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (data) {
    return data;
  }
  throw error ? error : new Error("No data returned");
}

/**
 * HTTP client for making requests to our Supabase edge functions API.
 */
export const APIClient = {
  getFullURL: <Route extends keyof API>(
    route: Route,
    options: Pick<HTTPRequestOptions, "urlParams" | "queryParams"> = {},
  ): string => {
    return `${AvaSupabase.getEdgeFunctionsURL()}/${_buildRelativeAPIURL(route, options)}`;
  },
  get: async <Route extends keyof API>(
    route: Route,
    options: Omit<HTTPRequestOptions, "method"> = {},
  ): Promise<API[Route]["returnType"]> => {
    return await sendHTTPRequest(route, { method: "GET", ...options });
  },

  post: async <Route extends keyof API>(
    route: Route,
    options: Omit<HTTPRequestOptions, "method"> = {},
  ): Promise<API[Route]["returnType"]> => {
    return await sendHTTPRequest(route, {
      method: "POST",
      ...options,
      body: options.body ?? {},
    });
  },
};
