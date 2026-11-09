/**
 * Path segments of a URL, without the empty segments a leading slash
 * creates.
 */
export function pathParts(url: URL): string[] {
  return url.pathname.split("/").filter((part) => {
    return part.length > 0;
  });
}

/** Hostname shown to the person who pasted the link, without a leading www. */
export function sourceHost(url: URL): string {
  const host = url.hostname.toLowerCase();
  return host.startsWith("www.") ? host.slice(4) : host;
}

/**
 * The last path segment when it looks like a file name. A segment with no
 * dot is a page or an action, so the download learns the name from the
 * response instead.
 */
export function fileNameFromPath(url: URL): string | undefined {
  const parts = pathParts(url);
  const last = parts[parts.length - 1];
  if (last === undefined || !last.includes(".")) {
    return undefined;
  }
  return decodeURIComponent(last);
}
