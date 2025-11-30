import { getAppURL } from "$/env/getAppURL.ts";
import { buildHTTPQueryString } from "./buildHTTPQueryString.ts";
import { replaceURLPathParams } from "./replaceURLPathParams.ts";
import type { ValidURLQueryParamValue } from "./buildHTTPQueryString.ts";
import type { PathParams } from "./replaceURLPathParams.ts";
import type { AvaRoutePaths } from "$/config/AvaRoutePaths.types.ts";

/**
 * Constructs a full URL string for the given app page, optionally replacing
 * path params and appending query params.
 *
 * @example
 * buildAppPageURL({
 *   path: "/workspaces/$workspaceSlug/invites/$inviteId",
 *   pathParams: { workspaceSlug: "foo", inviteId: "bar" },
 *   queryParams: { id: 'abc', order: 2 },
 * })
 * // "https://app.avandar.xyz/workspaces/foo/invites/bar?id=abc&order=2"
 */
export function buildAppPageURL<RoutePath extends AvaRoutePaths>({
  path,
  queryParams,
  pathParams,
}: {
  path: RoutePath;
  queryParams?: Record<string, ValidURLQueryParamValue>;
  pathParams?: PathParams<RoutePath>;
}): string {
  const origin = getAppURL();
  const parsedPath = replaceURLPathParams({ path, pathParams });
  const url = new URL(parsedPath, origin);
  const queryString = buildHTTPQueryString(queryParams);
  return `${url.toString()}${queryString === "" ? "" : `?${queryString}`}`;
}
