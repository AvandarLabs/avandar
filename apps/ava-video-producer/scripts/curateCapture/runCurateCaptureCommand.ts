import { realpath } from "node:fs/promises";
import { isAbsolute, join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { CaptureFileSafety } from "../captureLib/CaptureFileSafety";
import { requireLicense } from "../requireLicense";
import { CliOutput } from "../runProducerCommand/CliOutput/CliOutput.mjs";
import { ProducerCli } from "../runProducerCommand/ProducerCli/ProducerCli.mjs";
import { CuratedOutputs } from "./CuratedOutputs";
import { makeCurationEvidenceFromRun } from "./makeCurationEvidenceFromRun";
import { PlainPaths } from "./PlainPaths";
import type { CurationReceipt } from "./curateCapture.types";

const USAGE =
  "Usage: pnpm capture:curate out/captures/<passed-run> [--replace]";
/**
 * The run folder relative to the project, refusing anything outside
 * `out/captures/`.
 */
function _getRunRelative({
  requestedRoot,
  runDir,
}: Readonly<{
  requestedRoot: string;
  runDir: unknown;
}>): string {
  if (
    typeof runDir !== "string" ||
    runDir.split(/[\\/]/).some((part) => {
      return part.startsWith(".");
    })
  ) {
    throw new Error(
      "Capture run path must be plain without hidden segments or traversal",
    );
  }
  const runRelative = isAbsolute(runDir)
    ? relative(requestedRoot, runDir).split("\\").join("/")
    : runDir;
  CaptureFileSafety.validateRelativePath({
    value: runRelative,
    name: "capture run directory",
  });
  if (
    !runRelative.startsWith("out/captures/") ||
    runRelative === "out/captures/"
  ) {
    throw new Error("Capture run must be inside project out/captures");
  }
  return runRelative;
}
/** The `public/avandar` folder under a root, created when it is missing. */
function _getPublicDirectory(root: string): Promise<string> {
  return PlainPaths.getPlainPathFromRoot({
    root,
    name: "public/avandar",
    isDirectory: true,
    shouldCreate: true,
  });
}
type CurationSource = Awaited<
  ReturnType<typeof makeCurationEvidenceFromRun>
> & { root: string; sourceDirectory: string };
/**
 * The bounded capture directory and validated evidence used for installation.
 */
async function _readCurationSource({
  requestedRootPath,
  runDir,
}: Readonly<{
  requestedRootPath: string;
  runDir: string;
}>): Promise<CurationSource> {
  const { requestedRoot, root } = await _getRoots(requestedRootPath);
  const runRelative = _getRunRelative({
    requestedRoot,
    runDir,
  });
  const sourceDirectory = await PlainPaths.getPlainPathFromRoot({
    root,
    name: runRelative,
    isDirectory: true,
  });
  const curation = await makeCurationEvidenceFromRun({
    sourceDirectory,
    runRelative,
  });
  return { root, sourceDirectory, ...curation };
}

/**
 * Curates one passed capture into `public/avandar/`: its screenshots and an
 * evidence record, backing up any previous output when `replace` is set.
 * Never reads source paths outside that run directory.
 *
 * The `capture:curate` command runs it through `_main`, and it returns a
 * `CurationReceipt` naming the installed evidence and any backup.
 */
export async function runCurateCaptureCommand({
  root: requestedRootPath = process.cwd(),
  runDir,
  replace: shouldReplace = false,
}: Readonly<{
  root?: string;
  runDir: string;
  replace?: boolean;
}>): Promise<CurationReceipt> {
  const { root, sourceDirectory, evidence, manifestPath, manifestSha256 } =
    await _readCurationSource({ requestedRootPath, runDir });
  // Reject unsafe capture evidence before creating or inspecting public output.
  // react-doctor-disable-next-line server-sequential-independent-await
  const publicDirectory = await _getPublicDirectory(root);
  const existing = await CuratedOutputs.findExistingOutputs({
    publicDirectory,
    shouldReplace,
  });
  const { screenshots } = evidence;
  const stage = await CuratedOutputs.stageOutputs({
    root,
    sourceDirectory,
    screenshots,
    evidence,
  });
  const receipt = await CuratedOutputs.installStagedOutputs({
    root,
    publicDirectory,
    stage,
    existing,
    manifestPath,
    manifestSha256,
    source: evidence.source,
    screenshotCount: screenshots.length,
  });
  return _withInstalledPaths({ receipt, publicDirectory });
}
/**
 * The `capture:curate` command: curates a passed run, with --help and
 * --replace.
 */
async function _main(
  args: readonly string[] = process.argv.slice(2),
): Promise<void> {
  requireLicense();
  if (args.length === 1 && ["--help", "-h"].includes(args[0])) {
    console.log(USAGE);
    return;
  }
  if (
    !args[0] ||
    args[0].startsWith("--") ||
    args.length > 2 ||
    (args[1] && args[1] !== "--replace")
  ) {
    throw new Error(USAGE);
  }
  const result = await runCurateCaptureCommand({
    runDir: args[0],
    replace: args[1] === "--replace",
  });
  CliOutput.success(
    `Curated ${result.screenshots} screenshots: ${result.evidencePath}`,
  );
  if (result.backup) {
    console.error(`Previous curated output: ${result.backup}`);
  }
}
// `pnpm capture:curate` runs this file directly.
if (
  process.env.AVA_PRODUCER_WORKER_ENTRY === import.meta.url ||
  (process.argv[1] &&
    pathToFileURL(resolve(process.argv[1])).href === import.meta.url)
) {
  _main().catch((error: unknown) => {
    ProducerCli.failure("capture:curate", error);
    process.exitCode = 1;
  });
}

function _withInstalledPaths({
  receipt,
  publicDirectory,
}: Readonly<{
  receipt: Omit<CurationReceipt, "evidencePath" | "screensDirectory">;
  publicDirectory: string;
}>): CurationReceipt {
  return {
    ...receipt,
    evidencePath: join(publicDirectory, "capture-evidence.json"),
    screensDirectory: join(publicDirectory, "screens"),
  };
}

async function _getRoots(
  requestedRootPath: string,
): Promise<{ requestedRoot: string; root: string }> {
  const requestedRoot = resolve(requestedRootPath);
  return { requestedRoot, root: await realpath(requestedRoot) };
}
