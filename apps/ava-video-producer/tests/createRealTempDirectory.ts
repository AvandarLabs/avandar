import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

/**
 * Creates an empty temporary directory and returns its real path, with any
 * symlink in the temporary location resolved. Use it as the app root of a
 * test that builds a showcase fixture.
 */
export async function createRealTempDirectory(prefix: string): Promise<string> {
  // Vite names pages relative to its resolved root, so a symlinked tmp folder
  // breaks them.
  return fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), prefix)));
}
