import { realpath } from "node:fs/promises";
import { isAbsolute, join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { validateRelativePath } from "../captureLib/fsSafetyHelpers";
import { requireLicense } from "../requireLicense";
import {
  findExistingOutputs,
  installStagedOutputs,
  stageOutputs,
} from "./curatedOutputHelpers";
import { makeCurationEvidenceFromRun } from "./makeCurationEvidenceFromRun";
import { getPlainPathFromRoot } from "./plainPathHelpers";
import type { CurationReceipt } from "./curateCapture.types";

const USAGE =
  "Usage: pnpm capture:curate out/captures/<passed-run> [--replace]";

/**
 * The run folder relative to the project, refusing anything outside
 * `out/captures/`.
 */
function _getRunRelative(requestedRoot: string, runDir: unknown): string {
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
  validateRelativePath(runRelative, "capture run directory");
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
  return getPlainPathFromRoot({
    root,
    name: "public/avandar",
    isDirectory: true,
    shouldCreate: true,
  });
}

/**
 * Curates one passed capture into `public/avandar/`: its screenshots and an
 * evidence record, backing up any previous output when `replace` is set.
 * Never reads source paths outside that run directory.
 *
 * The `capture:curate` command runs it through `_main`, and it returns a
 * `CurationReceipt` naming the installed evidence and any backup.
 */
export async function curateCapture({
  root: requestedRootPath = process.cwd(),
  runDir,
  replace: shouldReplace = false,
}: Readonly<{
  root?: string;
  runDir: string;
  replace?: boolean;
}>): Promise<CurationReceipt> {
  const requestedRoot = resolve(requestedRootPath);
  const root = await realpath(requestedRoot);
  const runRelative = _getRunRelative(requestedRoot, runDir);
  const sourceDirectory = await getPlainPathFromRoot({
    root,
    name: runRelative,
    isDirectory: true,
  });
  const { evidence, manifestPath, manifestSha256 } =
    await makeCurationEvidenceFromRun({ sourceDirectory, runRelative });
  const publicDirectory = await _getPublicDirectory(root);
  const existing = await findExistingOutputs({
    publicDirectory,
    shouldReplace,
  });
  const { screenshots } = evidence;
  const stage = await stageOutputs({
    root,
    sourceDirectory,
    screenshots,
    evidence,
  });
  const receipt = await installStagedOutputs({
    root,
    publicDirectory,
    stage,
    existing,
    manifestPath,
    manifestSha256,
    source: evidence.source,
    screenshotCount: screenshots.length,
  });
  return {
    ...receipt,
    evidencePath: join(publicDirectory, "capture-evidence.json"),
    screensDirectory: join(publicDirectory, "screens"),
  };
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
  const result = await curateCapture({
    runDir: args[0],
    replace: args[1] === "--replace",
  });
  console.log(
    `Curated ${result.screenshots} screenshots: ${result.evidencePath}`,
  );
  if (result.backup) {
    console.log(`Previous curated output: ${result.backup}`);
  }
}

// `pnpm capture:curate` runs this file directly.
if (
  process.argv[1] &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url
) {
  _main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
