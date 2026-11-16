import { rename, writeFile } from "node:fs/promises";
import { basename, relative, sep } from "node:path";
import { isWithin } from "./fsSafetyHelpers";
import { assertSafeManifest } from "./sanitizeHelpers";

/**
 * Validates a manifest for leaked credentials, then writes it atomically
 * with owner-only mode.
 */
export async function writeManifest({
  path,
  manifest,
  secrets = [],
}: Readonly<{
  path: string;
  manifest: unknown;
  secrets?: ReadonlyArray<string | undefined>;
}>): Promise<void> {
  assertSafeManifest({ value: manifest, secrets });
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
export function getArtifactPathFromRunPath(root: string, path: string): string {
  if (!isWithin(root, path)) {
    throw new Error("Artifact escapes capture directory");
  }
  return relative(root, path).split(sep).join("/");
}

/** Derives a capture run's id from its run directory name. */
export function getCaptureRunIdFromRunPath(path: string): string {
  return basename(path);
}
