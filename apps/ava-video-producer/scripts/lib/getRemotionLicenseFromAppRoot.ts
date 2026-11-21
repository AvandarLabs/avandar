import { readFileSync } from "node:fs";
import path from "node:path";
import { parseEnv } from "node:util";
/** The Remotion license pair every producer command needs. */
export type RemotionLicense = {
  publicKey: string;
  privateKey: string;
};
const SETUP_MESSAGE =
  "Remotion license keys are required. Copy .env.video-producer.example " +
  "to .env.video-producer.local in the workspace root and set " +
  "REMOTION_PUBLIC_KEY and REMOTION_PRIVATE_KEY (or set them in the process " +
  "environment). Producer commands copy that file to " +
  "apps/ava-video-producer/.env.local. Use your own Remotion Automators keys.";
function _readKeys(filename: string): Partial<Record<string, string>> {
  try {
    const values = parseEnv(readFileSync(filename, "utf8"));
    return {
      REMOTION_PUBLIC_KEY: values.REMOTION_PUBLIC_KEY,
      REMOTION_PRIVATE_KEY: values.REMOTION_PRIVATE_KEY,
    };
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return {};
    }
    throw new Error(
      `${SETUP_MESSAGE} The key file could not be read or parsed.`,
    );
  }
}
/**
 * Reads only the Remotion license pair, without populating `process.env`, so
 * no other dotenv value can reach browser bundles. Use it wherever a
 * producer process needs the keys, for example the license guard or the
 * Remotion configuration. Throws setup guidance when a key is missing.
 */
export function getRemotionLicenseFromAppRoot({
  appRoot,
  environment = process.env,
}: Readonly<{
  appRoot: string;
  environment?: Readonly<NodeJS.ProcessEnv>;
}>): RemotionLicense {
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
