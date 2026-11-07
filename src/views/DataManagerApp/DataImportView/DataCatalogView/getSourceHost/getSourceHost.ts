/**
 * The host a link points at, without a leading `www.`, such as
 * `data.cityofnewyork.us`. A link named by its host tells a user where it
 * goes without a full URL running across the pane. Returns the input
 * unchanged when it is not a URL, so a malformed value still shows.
 */
export function getSourceHost(url: string): string {
  // `URL.canParse` is missing from older Safari and desktop WebViews, so a
  // failed parse is caught instead.
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
