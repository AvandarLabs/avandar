/**
 * Returns the absolute URL to a page in the website
 * @param path The path to the page, relative to the website root
 * @param params Optional query parameters
 * @returns The absolute URL to the page
 */
export function getRelativeURL(
  path: string,
  params?: Record<string, string>,
): string {
  const fixedPath = path.startsWith("/") ? path : `/${path}`;
  const query = new URLSearchParams(params).toString();
  const queryStr = query ? `?${query}` : "";
  return `${process.env.SITE_URL ?? ""}${fixedPath}${queryStr}`;
}
