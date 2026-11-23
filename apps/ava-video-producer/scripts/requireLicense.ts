import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { copyRootEnvFile } from "./lib/copyRootEnvFile";
import {
  type RemotionLicense,
  getRemotionLicenseFromAppRoot,
} from "./lib/getRemotionLicenseFromAppRoot";
/**
 * The license guard every producer entry point runs before doing work. It
 * copies the workspace root's `.env.video-producer.local` into this app, so
 * each command reads the current root keys, and returns the license pair.
 * Throws setup guidance when the keys are missing.
 */
export function requireLicense(
  environment: Readonly<NodeJS.ProcessEnv> = process.env,
): RemotionLicense {
  const appRoot = fileURLToPath(new URL("../", import.meta.url));
  copyRootEnvFile({
    appRoot,
    environment,
  });
  return getRemotionLicenseFromAppRoot({
    appRoot,
    environment,
  });
}
// Run directly, it checks the keys before a command body can do work.
if (
  process.argv[1] &&
  pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url
) {
  try {
    requireLicense();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
