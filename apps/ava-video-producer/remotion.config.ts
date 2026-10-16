import { Config } from "@remotion/cli/config";
import { readLicense } from "./scripts/lib/readLicense.mjs";

// Remotion evaluates bundled configuration from the app root.
const { publicKey } = readLicense(process.cwd());

// Preserve inherited credentials for reloads under a server-only prefix.
// The CLI forwards REMOTION_* variables to browser code, including key paths.
Object.keys(process.env)
  .filter(
    (name) =>
      name.startsWith("REMOTION_") &&
      name.includes("KEY") &&
      name !== "REMOTION_PUBLIC_KEY",
  )
  .forEach((name) => {
    process.env[`AVANDAR_${name}`] = process.env[name];
    delete process.env[name];
  });

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);

// Only this deliberately empty file is loaded by Remotion. Never expose
// .env.local (which contains a private key) to the browser bundle.
Config.setDotEnvLocation("remotion.env");
Config.setPublicLicenseKey(publicKey);

/* Studio preview only. Every render goes through scripts/render.sh, which
 * sets concurrency: 1 through the renderer API. See hard
 * rule 1 in the skill for why that is not negotiable. */
Config.setConcurrency(2);

/* Remotion downloads its own Chrome Headless Shell on first render, and on
 * almost every machine that is what you want — it is isolated, versioned
 * with the project, and unaffected by whatever your desktop browser is
 * doing. Leave this alone unless a render will not start at all.
 *
 * The escape hatch, for a machine where the download is blocked or the
 * shell will not launch:
 *
 *   export CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
 *
 * If you use it, QUIT CHROME FIRST. Launching a second instance of a
 * browser that is already running hands off to the existing process and
 * exits without opening a debugging port, and the render dies on
 * "Timed out after 25000 ms while trying to connect to the browser" with
 * an empty Chrome log — which looks like anything except the real cause.
 */
if (process.env.CHROME_PATH) {
  Config.setChromeMode("chrome-for-testing");
  Config.setBrowserExecutable(process.env.CHROME_PATH);
}
