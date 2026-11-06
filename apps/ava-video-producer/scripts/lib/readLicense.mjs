import { readFileSync } from "node:fs";
import path from "node:path";
import { parseEnv } from "node:util";

const SETUP_MESSAGE =
  "Remotion license keys are required. Set REMOTION_PUBLIC_KEY and " +
  "REMOTION_PRIVATE_KEY in apps/ava-video-producer/.env.local " +
  "(or the process environment). Use your own Remotion Automators keys.";

/** Read only the license pair without exposing dotenv values to browser code. */
export function readLicense(appRoot, environment = process.env) {
  const filename = path.resolve(
    appRoot,
    environment.REMOTION_KEYS_FILE ||
      environment.AVANDAR_REMOTION_KEYS_FILE ||
      ".env.local",
  );
  const values = _readKeys(filename);
  const publicKey = (
    environment.REMOTION_PUBLIC_KEY ??
    values.REMOTION_PUBLIC_KEY ??
    ""
  ).trim();
  const privateKey = (
    environment.REMOTION_PRIVATE_KEY ??
    environment.AVANDAR_REMOTION_PRIVATE_KEY ??
    values.REMOTION_PRIVATE_KEY ??
    ""
  ).trim();
  if (!publicKey || !privateKey || privateKey === "free-license") {
    throw new Error(SETUP_MESSAGE);
  }
  // Remotion requires this public prefix. Private keys are opaque strings.
  if (!publicKey.startsWith("rm_pub_")) {
    throw new Error(
      `${SETUP_MESSAGE} The public key must start with rm_pub_. Key values are never printed.`,
    );
  }
  return { publicKey, privateKey };
}

function _readKeys(filename) {
  try {
    const values = parseEnv(readFileSync(filename, "utf8"));
    return {
      REMOTION_PUBLIC_KEY: values.REMOTION_PUBLIC_KEY,
      REMOTION_PRIVATE_KEY: values.REMOTION_PRIVATE_KEY,
    };
  } catch (error) {
    if (error.code === "ENOENT") {
      return {};
    }
    throw new Error(
      `${SETUP_MESSAGE} The key file could not be read or parsed.`,
    );
  }
}
