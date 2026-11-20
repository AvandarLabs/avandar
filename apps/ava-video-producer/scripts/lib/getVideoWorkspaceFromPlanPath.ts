import fs from "node:fs/promises";
import path from "node:path";
import { getProductRootFromProducerRoot } from "./productSourceHelpers";

/** Throws when any path segment below the private root is a symlink. */
async function _assertNoSymlinks(
  privateRoot: string,
  parts: readonly string[],
): Promise<void> {
  const folders = [
    privateRoot,
    ...parts.map((_, index) => {
      return path.join(privateRoot, ...parts.slice(0, index + 1));
    }),
  ];
  const results = await Promise.allSettled(
    folders.map((folder) => {
      return fs.lstat(folder);
    }),
  );
  // Report the outermost problem, as a walk from the private root would.
  results.forEach((result) => {
    if (result.status === "rejected") {
      throw result.reason;
    }
    if (result.value.isSymbolicLink()) {
      throw new Error("Private project paths cannot contain a symlink");
    }
  });
}

/**
 * Returns the workspace folder a plan renders into: its private
 * `.videos/<project>/` folder, or the producer app for tracked plans. The
 * video CLI calls it so private projects keep their outputs beside their
 * plan. Refuses symlinked or malformed private paths.
 */
export async function getVideoWorkspaceFromPlanPath(
  producerRoot: string,
  filename: string,
): Promise<string> {
  const privateRoot = path.join(
    getProductRootFromProducerRoot(producerRoot),
    ".videos",
  );
  const relativePlanPath = path.relative(privateRoot, path.resolve(filename));
  if (
    relativePlanPath.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relativePlanPath)
  ) {
    return producerRoot;
  }
  const parts = relativePlanPath.split(path.sep);
  if (parts.length < 2 || !parts[0] || parts[0].startsWith(".")) {
    throw new Error("Private plans belong in .videos/<project>/.");
  }
  await _assertNoSymlinks(privateRoot, parts);
  return path.join(privateRoot, parts[0]);
}
