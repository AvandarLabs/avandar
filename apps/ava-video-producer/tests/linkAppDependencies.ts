import fs from "node:fs/promises";
import path from "node:path";

/**
 * Makes a temporary app root able to import this app's packages: it links the
 * app's `node_modules` into the root and writes an ESM `package.json`. Use it
 * when a test builds or runs showcase code against a throwaway root.
 */
export async function linkAppDependencies(root: string): Promise<void> {
  await fs.symlink(
    path.resolve("node_modules"),
    path.join(root, "node_modules"),
  );
  await fs.writeFile(path.join(root, "package.json"), '{"type":"module"}');
}
