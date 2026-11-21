import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  LICENSE_FIXTURE,
  LicenseFixtures,
} from "../../../tests/LicenseFixtures";

const APP_ROOT = fileURLToPath(new URL("../../../", import.meta.url));
const STUDIO_CONFIGURATION_PROBE = `
          const path = require("node:path");
          const {CliInternals} = require("@remotion/cli");
          const {BrowserSafeApis} = require("@remotion/renderer/client");
          const {getEnvironmentVariables} = require(path.join(path.dirname(require.resolve("@remotion/cli")), "get-env.js"));
          CliInternals.loadConfig(process.cwd()).then(async () => {
            const publicKey = BrowserSafeApis.options.publicLicenseKeyOption.getValue({commandLine: {}}).value;
            if (publicKey !== ${JSON.stringify(LICENSE_FIXTURE.publicKey)}) process.exit(2);
            const browserEnv = getEnvironmentVariables(null, "error", false);
            if (Object.keys(browserEnv).some(name => name !== "REMOTION_PUBLIC_KEY")) process.exit(3);
            if (!process.env.AVANDAR_REMOTION_KEYS_FILE) process.exit(4);
            if (process.env.PRODUCER_LICENSE_SOURCE === "environment" && !process.env.AVANDAR_REMOTION_PRIVATE_KEY) process.exit(4);
            await CliInternals.loadConfig(process.cwd());
            const reloadedEnv = getEnvironmentVariables(null, "error", false);
            if (Object.keys(reloadedEnv).some(name => name !== "REMOTION_PUBLIC_KEY")) process.exit(3);
            console.log("configured");
          });
        `;

function _assertEnvironment({
  directory,
  source,
}: Readonly<{ directory: string; source: string }>): void {
  const environment: NodeJS.ProcessEnv = {
    ...LicenseFixtures.licenseTestEnvironment(path.join(directory, "keys.env")),
    PRODUCER_LICENSE_SOURCE: source,
  };
  if (source === "environment") {
    environment.REMOTION_KEYS_FILE = path.join(directory, "missing.env");
    Object.assign(environment, {
      REMOTION_PUBLIC_KEY: LICENSE_FIXTURE.publicKey,
      REMOTION_PRIVATE_KEY: LICENSE_FIXTURE.privateKey,
      REMOTION_PRIVATE_LICENSE_KEY: LICENSE_FIXTURE.privateKey,
    });
  }
  const result = spawnSync(
    process.execPath,
    ["-e", STUDIO_CONFIGURATION_PROBE],
    { cwd: APP_ROOT, env: environment, encoding: "utf8", timeout: 10000 },
  );
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, "configured\n");
  assert.equal(result.stderr, "");
}

/**
 * Runs real Remotion Studio configuration checks with inert test credentials.
 */
export const StudioLicenseTestHelpers = {
  /** Asserts public-only browser configuration from one fixture key source. */
  assertEnvironment: _assertEnvironment,
};
