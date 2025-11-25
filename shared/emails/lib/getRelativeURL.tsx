/**
 * Returns the absolute URL to a page in the website. The domain for the
 * absolute URL is taken from the `VITE_APP_URL` environment variable.
 * @param relativePath The path to the page, relative to the website root
 * @param params Optional query parameters
 * @returns The absolute URL to the page
 */
export function getRelativeURL(
  relativePath: string,
  params?: Record<string, string>,
): string {
  if (!process.env.VITE_APP_URL) {
    throw new Error(
      "VITE_APP_URL is not set. We cannot build absolute URLs without it.",
    );
  }

  const fixedPath =
    relativePath.startsWith("/") ? relativePath : `/${relativePath}`;
  const fixedDomain =
    process.env.VITE_APP_URL?.endsWith("/") ?
      process.env.VITE_APP_URL.slice(0, -1)
    : process.env.VITE_APP_URL;
  const query = new URLSearchParams(params).toString();
  const queryStr = query ? `?${query}` : "";
  return `${fixedDomain}${fixedPath}${queryStr}`;
}
