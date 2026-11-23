import { readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { productRoot } from "./product-source.mjs";

/** The producer's env file in the workspace root, next to every other env file. */
export const ROOT_ENV_FILENAME = ".env.video-producer.local";

/**
 * Copy the workspace root's `.env.video-producer.local` to this app's
 * `.env.local`, the file the license loader reads. Avandar keeps every env
 * file in the workspace root, and each command copies its file to the
 * directory that reads it.
 *
 * Nothing is copied when `REMOTION_KEYS_FILE` names another key file, or when
 * the root file does not exist, so an existing app `.env.local` keeps working.
 * An app file that already matches is not rewritten, which keeps its
 * modification time stable for file watchers. The copy is written to a
 * temporary file and renamed over the target, so a concurrent command never
 * reads a partial file.
 */
export function copyRootEnvFile(appRoot, environment = process.env) {
  if (
    environment.REMOTION_KEYS_FILE ||
    environment.AVANDAR_REMOTION_KEYS_FILE
  ) {
    return;
  }
  const contents = _readOptionalFile(
    path.join(productRoot(appRoot), ROOT_ENV_FILENAME),
  );
  if (contents === undefined) {
    return;
  }
  const target = path.join(appRoot, ".env.local");
  if (_readOptionalFile(target)?.equals(contents)) {
    return;
  }
  const temporaryTarget = `${target}.${process.pid}.tmp`;
  try {
    writeFileSync(temporaryTarget, contents, { mode: 0o600 });
    renameSync(temporaryTarget, target);
  } finally {
    rmSync(temporaryTarget, { force: true });
  }
}

function _readOptionalFile(filename) {
  try {
    return readFileSync(filename);
  } catch (error) {
    if (error.code === "ENOENT") {
      return undefined;
    }
    throw error;
  }
}
