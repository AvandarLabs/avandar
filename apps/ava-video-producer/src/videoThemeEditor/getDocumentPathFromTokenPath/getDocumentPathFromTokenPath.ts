import { isMantineTokenRoot } from "../../videoTheme/tokenCatalog/tokenCatalogHelpers";

/**
 * Where a token lives in a theme file, such as
 * `other.video.semantic.color.accent` for `color.accent`. Use it to read or
 * write a token in a document or patch.
 */
export function getDocumentPathFromTokenPath(
  tokenPath: string,
): readonly string[] {
  const [root, ...rest] = tokenPath.split(".");
  if (root === "atomic") {
    return ["other", "video", "atomic", ...rest];
  }
  if (root === "components") {
    const [name, ...props] = rest;
    return ["components", name, "defaultProps", ...props];
  }
  return isMantineTokenRoot(root)
    ? [root, ...rest]
    : ["other", "video", "semantic", root, ...rest];
}
