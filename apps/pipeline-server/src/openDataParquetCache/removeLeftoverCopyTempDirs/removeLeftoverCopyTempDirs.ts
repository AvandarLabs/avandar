import { readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PARQUET_COPY_TEMP_PREFIX } from "@pipeline-server/openDataParquetCache/buildOpenDataParquetCache/buildOpenDataParquetCache";

/**
 * Deletes the temp folders Parquet copy builds left behind. A build deletes
 * its own folder when it ends, so a folder still there was left by a build
 * a deploy or crash killed. Call it once, when the server starts and before
 * it queues any build.
 *
 * @param tempDir - Where builds make their temp folders. Defaults to the
 *   system temp directory, which the server's config points at its volume.
 * @returns The folders it deleted.
 */
export async function removeLeftoverCopyTempDirs(
  tempDir: string = tmpdir(),
): Promise<string[]> {
  let names: string[];
  try {
    names = await readdir(tempDir);
  } catch {
    return [];
  }
  const leftovers = names
    .filter((name) => {
      return name.startsWith(PARQUET_COPY_TEMP_PREFIX);
    })
    .map((name) => {
      return join(tempDir, name);
    });
  await Promise.all(
    leftovers.map((path) => {
      return rm(path, { force: true, recursive: true });
    }),
  );
  return leftovers;
}
