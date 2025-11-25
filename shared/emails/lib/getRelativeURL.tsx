/**
 * Returns the absolute URL to a page in the website. The domain for the
 * absolute URL is taken from the `VITE_APP_URL` environment variable.
 * @param options The options for the URL
 * @param options.domain The domain of the website
 * @param options.path The path to the page, relative to the website root
 * @param options.queryParams Optional query parameters
 * @returns The absolute URL to the page
 */
export function getRelativeURL(options: {
  domain: string;
  path: string;
  queryParams?: Record<string, string>;
}): string {
  const { domain, path, queryParams: params } = options;
  const fixedPath = path.startsWith("/") ? path : `/${path}`;
  const fixedDomain = domain.endsWith("/") ? domain.slice(0, -1) : domain;
  const query = new URLSearchParams(params).toString();
  const queryStr = query ? `?${query}` : "";
  return `${fixedDomain}${fixedPath}${queryStr}`;
}
