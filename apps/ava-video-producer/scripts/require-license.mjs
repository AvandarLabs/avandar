import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { readLicense } from "./lib/readLicense.mjs";

/** Require this app's license pair independently of the caller's directory. */
export function requireLicense(environment = process.env) {
  return readLicense(
    fileURLToPath(new URL("../", import.meta.url)),
    environment,
  );
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
