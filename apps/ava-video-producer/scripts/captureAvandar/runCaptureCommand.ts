import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { CaptureSanitization } from "../captureLib/CaptureSanitization";
import { CaptureUrlSafety } from "../captureLib/CaptureUrlSafety/CaptureUrlSafety";
import { requireLicense } from "../requireLicense";
import { CliOutput } from "../runProducerCommand/CliOutput/CliOutput.mjs";
import { InventoryView } from "../runProducerCommand/InventoryView/InventoryView.mjs";
import { ProducerCli } from "../runProducerCommand/ProducerCli/ProducerCli.mjs";
import { loadFlows } from "./loadFlows";
import { parseCaptureArgs } from "./parseCaptureArgs";
import { runCapture } from "./runCapture";
/** The `pnpm capture` command: records flows, or lists them with `--list`. */
async function _main(): Promise<void> {
  requireLicense();
  const { help, list, ...options } = parseCaptureArgs({
    args: process.argv.slice(2),
  });
  if (help) {
    console.log(
      "Usage: pnpm capture [--flows import,explorer,dashboards,cases,map] [--base-url http://localhost:5173] [--workspace avandar-labs] [--run-label harborfield] [--fixture-dir demo-data] [--root <repo>] [--list]",
    );
    return;
  }
  if (list) {
    const flows = await loadFlows(options.root ?? process.cwd());
    process.exitCode = await InventoryView.show({
      rows: Object.keys(flows).map((id) => {
        return {
          id: CaptureUrlSafety.validateId({ value: id, name: "flow id" }),
          name: id,
          group: "Capture flows",
        };
      }),
      words: JSON.parse(process.env.AVA_PRODUCER_LIST_FILTER ?? "[]"),
    });
    return;
  }
  const result = await runCapture(options);
  if (result.status === "passed")
    CliOutput.success(`Capture ${result.status}: ${result.manifestPath}`);
  else {
    ProducerCli.failure(
      "capture",
      new Error(`Capture ${result.status}: ${result.manifestPath}`),
    );
  }
}
// `pnpm capture` runs this file directly.
if (
  process.env.AVA_PRODUCER_WORKER_ENTRY === import.meta.url ||
  (process.argv[1] &&
    resolve(process.argv[1]) === fileURLToPath(import.meta.url))
) {
  _main().catch((error: unknown) => {
    ProducerCli.failure(
      "capture",
      CaptureSanitization.makeRedactedTextFromValue({
        value: error instanceof Error ? error.message : String(error),
        secrets: [
          process.env.AVANDAR_DEMO_EMAIL,
          process.env.AVANDAR_DEMO_PASSWORD,
        ],
      }),
    );
    process.exitCode = 1;
  });
}
