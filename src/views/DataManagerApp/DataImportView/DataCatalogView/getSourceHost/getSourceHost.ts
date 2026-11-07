/**
 * The host a link points at, without a leading `www.`, such as
 * `data.cityofnewyork.us`. A link named by its host tells a user where it
 * goes without a full URL running across the pane. Returns the input
 * unchanged when it is not a URL, so a malformed value still shows.
 */
export function getSourceHost(url: string): string {
  if (!URL.canParse(url)) {
    return url;
  }
  return new URL(url).hostname.replace(/^www\./, "");
}
