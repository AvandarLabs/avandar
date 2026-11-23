/**
 * The token path for a theme file path, such as a zod issue path. Use it to
 * attach a schema problem to the editor row it belongs to.
 */
export function getTokenPathFromDocumentPath(
  documentPath: readonly PropertyKey[],
): string {
  const segments = documentPath.map(String);
  const isVideo = segments[0] === "other" && segments[1] === "video";
  if (isVideo && segments[2] === "atomic") {
    return ["atomic", ...segments.slice(3)].join(".");
  }
  if (isVideo && segments[2] === "semantic") {
    return segments.slice(3).join(".");
  }
  if (segments[0] === "components" && segments[2] === "defaultProps") {
    return ["components", segments[1], ...segments.slice(3)].join(".");
  }
  return segments.join(".");
}
