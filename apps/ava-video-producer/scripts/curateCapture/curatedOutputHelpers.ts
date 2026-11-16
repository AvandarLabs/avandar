import { constants } from "node:fs";
import { copyFile, mkdir, mkdtemp, rename, writeFile } from "node:fs/promises";
import { basename, join, relative } from "node:path";
import { getSha256FromFile } from "../lib/getSha256FromFile";
import {
  getOptionalStatFromPath,
  getPlainPathFromRoot,
  inspectExistingTree,
} from "./plainPathHelpers";
import type {
  CuratedScreenshot,
  CurationReceipt,
  StagedCuration,
} from "./curateCapture.types";

/** The files curation installs under `public/avandar/`. */
const TARGETS = ["screens", "capture-evidence.json"] as const;

/** What `stageOutputs` copies into a fresh staging folder. */
type StagingRequest = {
  root: string;
  sourceDirectory: string;
  screenshots: readonly CuratedScreenshot[];
  evidence: unknown;
};

/** What `_installOutputs` moves, and where it backs up what it replaces. */
type InstallRequest = {
  publicDirectory: string;
  stage: string;
  existing: readonly string[];
  backup: string | null;
};

/**
 * Finds the curated outputs already installed, refusing them unless
 * `shouldReplace` is set. `curateCapture` calls it before staging anything.
 */
export async function findExistingOutputs(
  publicDirectory: string,
  shouldReplace: boolean,
): Promise<string[]> {
  const existing: string[] = [];
  // Check one target at a time, so the first unsafe or blocked one stops it.
  for (const name of TARGETS) {
    const target = join(publicDirectory, name);
    if (await getOptionalStatFromPath(target)) {
      await inspectExistingTree(target);
      if (!shouldReplace) {
        throw new Error(
          "Curated output already exists; use --replace to back it up before replacement",
        );
      }
      existing.push(name);
    }
  }
  return existing;
}

/** Copies the screenshots and evidence into a fresh staging folder. */
export async function stageOutputs(
  options: Readonly<StagingRequest>,
): Promise<string> {
  const stagingRoot = await getPlainPathFromRoot({
    root: options.root,
    name: "out/capture-curation",
    isDirectory: true,
    shouldCreate: true,
  });
  const stage = await mkdtemp(join(stagingRoot, "curation-"));
  await mkdir(join(stage, "screens"));
  // Copy one screenshot at a time, so a changed file stops staging at once.
  for (const screenshot of options.screenshots) {
    const destination = join(stage, "screens", basename(screenshot.asset));
    await copyFile(
      await getPlainPathFromRoot({
        root: options.sourceDirectory,
        name: screenshot.capturePath,
      }),
      destination,
      constants.COPYFILE_EXCL,
    );
    if ((await getSha256FromFile(destination)) !== screenshot.sha256) {
      throw new Error(
        "Screenshot changed during curation; staged output retained",
      );
    }
  }
  await writeFile(
    join(stage, "capture-evidence.json"),
    `${JSON.stringify(options.evidence, null, 2)}\n`,
    { flag: "wx", mode: 0o600 },
  );
  return stage;
}

/**
 * Moves existing outputs into `backup`, then installs the staged ones,
 * undoing every completed move in reverse order if any move fails.
 */
async function _installOutputs(
  options: Readonly<InstallRequest>,
): Promise<void> {
  const { publicDirectory, stage, backup } = options;
  const backedUp: string[] = [];
  const installed: string[] = [];
  try {
    for (const name of options.existing) {
      await rename(join(publicDirectory, name), join(backup ?? stage, name));
      backedUp.push(name);
    }
    for (const name of TARGETS) {
      await rename(join(stage, name), join(publicDirectory, name));
      installed.push(name);
    }
  } catch (error) {
    for (const name of installed.reverse()) {
      await rename(join(publicDirectory, name), join(stage, name));
    }
    for (const name of backedUp.reverse()) {
      await rename(join(backup ?? stage, name), join(publicDirectory, name));
    }
    throw error;
  }
}

/**
 * Re-checks the source manifest, installs the staged output (backing up what
 * it replaces), and writes the receipt beside the staged files.
 */
export async function installStagedOutputs(
  options: Readonly<StagedCuration>,
): Promise<Omit<CurationReceipt, "evidencePath" | "screensDirectory">> {
  const { root, publicDirectory, stage, existing } = options;
  if (
    (await getSha256FromFile(options.manifestPath)) !== options.manifestSha256
  ) {
    throw new Error(
      "Capture manifest changed during curation; staged output retained",
    );
  }
  const backup = existing.length ? join(stage, "previous") : null;
  if (backup) {
    await mkdir(backup);
  }
  await _installOutputs({ publicDirectory, stage, existing, backup });
  const receipt = {
    source: options.source,
    screenshots: options.screenshotCount,
    evidence: "public/avandar/capture-evidence.json",
    backup: backup ? relative(root, backup) : null,
  };
  await writeFile(
    join(stage, "receipt.json"),
    `${JSON.stringify(receipt, null, 2)}\n`,
    { flag: "wx" },
  );
  return receipt;
}
