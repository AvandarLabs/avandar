import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";

/**
 * Gets a file's SHA-256 digest as hex, streaming it so a large file is never
 * loaded into memory. Use it to bind an artifact to its exact contents, for
 * example a captured video or a fixture file.
 */
export async function getSha256FromFile(path: string): Promise<string> {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) {
    hash.update(chunk);
  }
  return hash.digest("hex");
}
