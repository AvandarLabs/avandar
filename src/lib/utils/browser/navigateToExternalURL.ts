/**
 * Navigates to an external URL.
 * @param url The URL to navigate to.
 * @param options The options for the navigation.
 * @param options.openInNewTab Whether to open the URL in a new tab.
 */
export function navigateToExternalURL(
  url: string,
  { openInNewTab = false }: { openInNewTab?: boolean } = {},
): void {
  if (typeof window === "undefined") {
    throw new Error("window is undefined");
  }

  if (openInNewTab) {
    window.open(url, "_blank", "noopener,noreferrer");
  } else if (window.location) {
    window.location.href = url;
  } else {
    throw new Error("window.location is undefined");
  }
}
