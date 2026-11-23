import { readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { ProductSources } from "./ProductSources";
/**
 * The producer's env file in the workspace root, next to every other env file.
 */
export const ROOT_ENV_FILENAME = ".env.video-producer.local";
function _readOptionalFile(filename: string): Buffer | undefined {
  try {
    return readFileSync(filename);
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return undefined;
    }
    throw error;
  }
}
/**
 * Copies the workspace root's `.env.video-producer.local` to this app's
 * `.env.local`, the file the license loader reads. The license guard calls
 * it before every producer command, because Avandar keeps every env file in
 * the workspace root.
 *
 * Nothing is copied when `REMOTION_KEYS_FILE` names another key file, or when
 * the root file does not exist, so an existing app `.env.local` keeps working.
 * An app file that already matches is not rewritten, which keeps its
 * modification time stable for file watchers.
 */
export function copyRootEnvFile({
  appRoot,
  environment = process.env,
}: Readonly<{
  appRoot: string;
  environment?: Readonly<NodeJS.ProcessEnv>;
}>): void {
  if (
    environment.REMOTION_KEYS_FILE ||
    environment.AVANDAR_REMOTION_KEYS_FILE
  ) {
    return;
  }
  const contents = _readOptionalFile(
    path.join(
      ProductSources.getProductRootFromProducerRoot(appRoot),
      ROOT_ENV_FILENAME,
    ),
  );
  if (contents === undefined) {
    return;
  }
  const target = path.join(appRoot, ".env.local");
  if (_readOptionalFile(target)?.equals(contents)) {
    return;
  }
  // Write a temporary file and rename it over the target, so a concurrent
  // command never reads a partial file.
  const temporaryTarget = `${target}.${process.pid}.tmp`;
  try {
    writeFileSync(temporaryTarget, contents, { mode: 0o600 });
    renameSync(temporaryTarget, target);
  } finally {
    rmSync(temporaryTarget, { force: true });
  }
}
