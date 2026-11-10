import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { copyRootEnvFile } from "./lib/copyRootEnvFile.mjs";
import { readLicense } from "./lib/readLicense.mjs";

/**
 * Require this app's license pair independently of the caller's directory.
 * Copies the workspace root's `.env.video-producer.local` into this app
 * first, so every producer command reads the current root keys.
 */
export function requireLicense(environment = process.env) {
  const appRoot = fileURLToPath(new URL("../", import.meta.url));
  copyRootEnvFile(appRoot, environment);
  return readLicense(appRoot, environment);
}

if (
  process.argv[1] &&
  pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url
) {
  try {
    requireLicense();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
