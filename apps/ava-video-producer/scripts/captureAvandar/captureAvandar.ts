import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { makeRedactedTextFromValue } from "../captureLib/sanitizeHelpers";
import { validateId } from "../captureLib/urlSafetyHelpers";
import { requireLicense } from "../requireLicense";
import { loadFlows } from "./loadFlows";
import { parseCaptureArgs } from "./parseCaptureArgs";
import { runCapture } from "./runCapture";

/** The `pnpm capture` command: records flows, or lists them with `--list`. */
async function _main(): Promise<void> {
  requireLicense();
  const { help, list, ...options } = parseCaptureArgs(process.argv.slice(2));
  if (help) {
    console.log(
      "Usage: pnpm capture [--flows import,explorer,dashboards,cases,map] [--base-url http://localhost:5173] [--workspace avandar-labs] [--run-label harborfield] [--fixture-dir demo-data] [--root <repo>] [--list]",
    );
    return;
  }
  if (list) {
    const flows = await loadFlows(options.root ?? process.cwd());
    Object.keys(flows).forEach((id) => {
      return console.log(validateId(id, "flow id"));
    });
    return;
  }
  const result = await runCapture(options);
  console.log(`Capture ${result.status}: ${result.manifestPath}`);
}

// `pnpm capture` runs this file directly.
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  _main().catch((error: Error) => {
    console.error(
      makeRedactedTextFromValue({
        value: error.message,
        secrets: [
          process.env.AVANDAR_DEMO_EMAIL,
          process.env.AVANDAR_DEMO_PASSWORD,
        ],
      }),
    );
    process.exitCode = 1;
  });
}
