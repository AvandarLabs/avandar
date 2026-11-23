import { createRequire } from "node:module";
import path from "node:path";

/**
 * Gets the source directory `@avandar/utils` resolves to from a root folder
 * that holds a `package.json`. Use it to point an `@utils` alias at the
 * package's own source, for example in a Vite or webpack bundle config.
 */
export function getAvandarUtilsDirectoryFromRoot(root: string): string {
  return path.dirname(
    createRequire(path.join(root, "package.json")).resolve("@avandar/utils"),
  );
}
