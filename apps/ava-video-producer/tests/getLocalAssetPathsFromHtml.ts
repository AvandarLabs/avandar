/**
 * Gets the served paths of the local scripts and stylesheets an HTML page
 * loads, without duplicates. Use it to check that every asset a built or
 * served page links resolves, for example in a build or a server test.
 */
export function getLocalAssetPathsFromHtml(html: string): string[] {
  const references = [
    ...html.matchAll(/<script[^>]*\ssrc="([^"]+)"/g),
    ...html.matchAll(/<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"/g),
    ...html.matchAll(/<link[^>]*href="([^"]+)"[^>]*rel="stylesheet"/g),
  ].map((match) => {
    return match[1];
  });
  return [...new Set(references)]
    .filter((reference) => {
      return !/^(?:[a-z]+:|\/\/)/i.test(reference);
    })
    .map((reference) => {
      return new URL(reference, "http://localhost/").pathname;
    });
}
