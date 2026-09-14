import { getAppURL } from "$/env/getAppURL.ts";
import { buildHttpQueryString } from "$/utils/urls/buildHttpQueryString/buildHttpQueryString.ts";
import { replaceURLPathParams } from "$/utils/urls/replaceURLPathParams.ts";
import type { AvaRoutePaths } from "$/config/AvaRoutePaths.types.ts";
import type { ValidUrlQueryParamValue } from "$/utils/urls/buildHttpQueryString/buildHttpQueryString.ts";
import type { PathParams } from "$/utils/urls/replaceURLPathParams.ts";

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
  queryParams?: Record<string, ValidUrlQueryParamValue>;
  pathParams?: PathParams<RoutePath>;
}): string {
  const origin = getAppURL();
  const parsedPath = replaceURLPathParams({ path, pathParams });
  const url = new URL(parsedPath, origin);
  const queryString = buildHttpQueryString(queryParams);
  return `${url.toString()}${queryString === "" ? "" : `?${queryString}`}`;
}
