import { rename, writeFile } from "node:fs/promises";
import { basename, relative, sep } from "node:path";
import { CaptureFileSafety } from "./CaptureFileSafety";
import { CaptureSanitization } from "./CaptureSanitization";
/**
 * Validates a manifest for leaked credentials, then writes it atomically
 * with owner-only mode.
 */
async function _writeManifest({
  path,
  manifest,
  secrets = [],
}: Readonly<{
  path: string;
  manifest: unknown;
  secrets?: ReadonlyArray<string | undefined>;
}>): Promise<void> {
  CaptureSanitization.assertSafeManifest({ value: manifest, secrets });
  const temporaryPath = `${path}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(manifest, null, 2)}\n`, {
    mode: 0o600,
  });
  await rename(temporaryPath, path);
}
/**
 * Expresses an artifact path relative to the capture root, rejecting one
 * that escapes it.
 */
function _getArtifactPathFromRunPath({
  root,
  path,
}: Readonly<{
  root: string;
  path: string;
}>): string {
  if (
    !CaptureFileSafety.isWithin({
      root,
      candidate: path,
    })
  ) {
    throw new Error("Artifact escapes capture directory");
  }
  return relative(root, path).split(sep).join("/");
}
/** Derives a capture run's id from its run directory name. */
function _getCaptureRunIdFromRunPath(path: string): string {
  return basename(path);
}

/** Writes sanitized capture manifests and locates their named artifacts. */
export const CaptureManifests = {
  /**
   * Validates a manifest for leaked credentials, then writes it atomically with
   * owner-only mode.
   */
  writeManifest: _writeManifest,
  /**
   * Expresses an artifact path relative to the capture root, rejecting one that
   * escapes it.
   */
  getArtifactPathFromRunPath: _getArtifactPathFromRunPath,
  /** Derives a capture run's id from its run directory name. */
  getCaptureRunIdFromRunPath: _getCaptureRunIdFromRunPath,
};
