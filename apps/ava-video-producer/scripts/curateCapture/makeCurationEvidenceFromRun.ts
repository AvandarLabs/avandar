import { lstat, readFile } from "node:fs/promises";
import { basename } from "node:path";
import { CaptureFileSafety } from "../captureLib/CaptureFileSafety";
import { CaptureSanitization } from "../captureLib/CaptureSanitization";
import { CaptureUrlSafety } from "../captureLib/CaptureUrlSafety/CaptureUrlSafety";
import { getSha256FromFile } from "../lib/getSha256FromFile";
import { PlainPaths } from "./PlainPaths";
import type {
  CaptureAction,
  CaptureCheckpoint,
  CaptureManifest,
} from "../captureAvandar/captureAvandar.types";
import type { FixtureFile } from "../captureLib/CaptureFileSafety";
import type {
  CuratedScreenshot,
  CurationEvidence,
} from "./curateCapture.types";

const HASH = /^[a-f0-9]{64}$/;
const IMAGE = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*\.(?:png|jpe?g|webp)$/;
/** What `_readScreenshotAndClaimFilename` checks one checkpoint against. */
type ScreenshotCheck = {
  checkpoint: CaptureCheckpoint;
  flows: ReadonlySet<string>;
  filenames: Set<string>;
  sourceDirectory: string;
};
function _readArray<T>({
  value,
  label,
}: Readonly<{
  value: readonly T[];
  label: string;
}>): T[] {
  if (!Array.isArray(value)) {
    throw new Error(`Capture manifest needs ${label}`);
  }
  return [...value];
}
function _readDigest({
  value,
  label,
}: Readonly<{
  value: unknown;
  label: string;
}>): string {
  if (typeof value !== "string" || !HASH.test(value)) {
    throw new Error(`Invalid SHA-256 for ${label}`);
  }
  return value;
}
function _readSafeUrl(value: unknown): string {
  if (typeof value !== "string") {
    throw new Error("Capture source URL must be text");
  }
  const cleanUrl = CaptureUrlSafety.makeSourceUrlFromUrl(value);
  if (cleanUrl.startsWith("[")) {
    throw new Error("Capture source URL must be HTTP(S)");
  }
  return CaptureSanitization.makeRedactedTextFromValue({ value: cleanUrl });
}
/** Reads the run's manifest, refusing anything but a passed version 1 run. */
async function _readPassedManifest(sourceDirectory: string): Promise<{
  manifest: CaptureManifest;
  manifestPath: string;
  manifestSha256: string;
}> {
  const manifestPath = await PlainPaths.getPlainPathFromRoot({
    root: sourceDirectory,
    name: "manifest.json",
  });
  if ((await lstat(manifestPath)).size > 10000000) {
    throw new Error("Capture manifest exceeds 10 MB");
  }
  const manifestSha256 = await getSha256FromFile(manifestPath);
  const manifest: CaptureManifest = JSON.parse(
    await readFile(manifestPath, "utf8"),
  );
  CaptureSanitization.assertSafeManifest({ value: manifest });
  if (manifest.schemaVersion !== 1 || manifest.status !== "passed") {
    throw new Error("Only a passed version 1 capture can be curated");
  }
  if (manifest.runId !== basename(sourceDirectory)) {
    throw new Error("Capture run ID does not match its directory");
  }
  return { manifest, manifestPath, manifestSha256 };
}
function _readPassedFlows(manifest: Readonly<CaptureManifest>): Set<string> {
  const flows = new Set<string>();
  _readArray({
    value: manifest.features,
    label: "features",
  }).forEach((feature) => {
    CaptureUrlSafety.validateId({
      value: feature.id,
      name: "flow id",
    });
    if (feature.status !== "passed" || flows.has(feature.id)) {
      throw new Error("Capture features must be unique and passed");
    }
    flows.add(feature.id);
  });
  if (!flows.size) {
    throw new Error("Capture has no passed features");
  }
  return flows;
}
function _readFixtures(manifest: Readonly<CaptureManifest>): FixtureFile[] {
  return _readArray({
    value: manifest.fixtures,
    label: "fixtures",
  }).map((fixture) => {
    return {
      path: CaptureFileSafety.validateRelativePath({
        value: fixture.path,
        name: "fixture metadata path",
      }),
      sha256: _readDigest({
        value: fixture.sha256,
        label: "fixture",
      }),
      bytes: fixture.bytes,
    };
  });
}
function _readActions({
  manifest,
  flows,
}: Readonly<{
  manifest: Readonly<CaptureManifest>;
  flows: ReadonlySet<string>;
}>): CaptureAction[] {
  return _readArray({
    value: manifest.actions,
    label: "actions",
  }).map((action) => {
    if (action.status !== "passed" || !flows.has(action.flowId)) {
      throw new Error(
        "Every capture action must belong to a passed flow and be passed",
      );
    }
    return {
      ...action,
      sourceUrl: _readSafeUrl(action.sourceUrl),
      ...(action.resultUrl
        ? { resultUrl: _readSafeUrl(action.resultUrl) }
        : {}),
    };
  });
}
/**
 * Validates one checkpoint, checks its screenshot's hash, and adds its
 * filename to the caller's `filenames` set so a duplicate name fails.
 */
async function _readScreenshotAndClaimFilename(
  options: Readonly<ScreenshotCheck>,
): Promise<CuratedScreenshot> {
  const { checkpoint, filenames } = options;
  if (checkpoint.status !== "passed" || !options.flows.has(checkpoint.flowId)) {
    throw new Error(
      "Every checkpoint must belong to a passed flow and be passed",
    );
  }
  CaptureUrlSafety.validateId({
    value: checkpoint.id,
    name: "checkpoint id",
  });
  const capturePath = CaptureFileSafety.validateRelativePath({
    value: checkpoint.screenshot?.path,
    name: "screenshot path",
  });
  const filename = basename(capturePath);
  if (!IMAGE.test(filename) || filenames.has(filename)) {
    throw new Error("Screenshot filenames must be unique plain image names");
  }
  filenames.add(filename);
  const source = await PlainPaths.getPlainPathFromRoot({
    root: options.sourceDirectory,
    name: capturePath,
  });
  const sha256 = _readDigest({
    value: checkpoint.screenshot?.sha256,
    label: "screenshot",
  });
  if ((await getSha256FromFile(source)) !== sha256) {
    throw new Error(`Screenshot hash mismatch: ${capturePath}`);
  }
  return {
    flowId: checkpoint.flowId,
    checkpointId: checkpoint.id,
    capturePath,
    asset: `avandar/screens/${filename}`,
    sha256,
    sourceUrl: _readSafeUrl(checkpoint.sourceUrl),
    atMs: checkpoint.atMs ?? null,
    videoAtMs: checkpoint.videoAtMs ?? null,
  };
}
async function _readScreenshots({
  manifest,
  flows,
  sourceDirectory,
}: Readonly<{
  manifest: Readonly<CaptureManifest>;
  flows: ReadonlySet<string>;
  sourceDirectory: string;
}>): Promise<CuratedScreenshot[]> {
  const checkpoints = _readArray({
    value: manifest.checkpoints,
    label: "checkpoints",
  });
  if (!checkpoints.length) {
    throw new Error("Capture has no screenshots to curate");
  }
  const filenames = new Set<string>();
  const screenshots: CuratedScreenshot[] = [];
  // Read in manifest order, so a duplicate name fails on its second use.
  for (const checkpoint of checkpoints) {
    screenshots.push(
      // Each read claims a filename in the shared set. Preserve manifest-order
      // rejection.
      // react-doctor-disable-next-line async-await-in-loop
      await _readScreenshotAndClaimFilename({
        checkpoint,
        flows,
        filenames,
        sourceDirectory,
      }),
    );
  }
  return screenshots;
}
/** The capture resources after every referenced flow has been validated. */
function _readResources({
  manifest,
  flows,
}: Readonly<{
  manifest: Readonly<CaptureManifest>;
  flows: ReadonlySet<string>;
}>): CurationEvidence["resources"] {
  const resources = _readArray({
    value: manifest.resources,
    label: "resources",
  });
  if (
    resources.some((resource) => {
      return !flows.has(resource.flowId);
    })
  ) {
    throw new Error("Capture resource refers to an unknown flow");
  }
  return resources;
}

/**
 * Builds the evidence record from a passed run's manifest, refusing a run
 * whose hashes, URLs, flows, or screenshots do not check out. `curateCapture`
 * calls it before anything is staged or installed.
 */
export async function makeCurationEvidenceFromRun({
  sourceDirectory,
  runRelative,
}: Readonly<{
  sourceDirectory: string;
  runRelative: string;
}>): Promise<{
  evidence: CurationEvidence;
  manifestPath: string;
  manifestSha256: string;
}> {
  const { manifest, manifestPath, manifestSha256 } =
    await _readPassedManifest(sourceDirectory);
  const flows = _readPassedFlows(manifest);
  const actions = _readActions({
    manifest,
    flows,
  });
  const fixtures = _readFixtures(manifest);
  const resources = _readResources({ manifest, flows });
  const screenshots = await _readScreenshots({
    manifest,
    flows,
    sourceDirectory,
  });
  const evidence = {
    schemaVersion: 1,
    curatedAt: new Date().toISOString(),
    source: {
      runId: manifest.runId,
      runDirectory: runRelative,
      manifest: `${runRelative}/manifest.json`,
      manifestSha256,
      status: "passed",
      startedAt: manifest.startedAt,
      finishedAt: manifest.finishedAt,
    },
    fixtures,
    actions,
    resources,
    screenshots,
  };
  CaptureSanitization.assertSafeManifest({ value: evidence });
  return { evidence, manifestPath, manifestSha256 };
}
