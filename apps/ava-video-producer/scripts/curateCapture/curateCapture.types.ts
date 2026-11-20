import type {
  CaptureAction,
  CaptureResource,
} from "../captureAvandar/captureAvandar.types";
import type { FixtureFile } from "../captureLib/fsSafetyHelpers";

/** One curated screenshot and where it came from. */
export type CuratedScreenshot = {
  flowId: string;
  checkpointId: string;
  capturePath: string;
  asset: string;
  sha256: string;
  sourceUrl: string;
  atMs: number | null;
  videoAtMs: number | null;
};

/** What `curateCapture` installed, and where the previous output went. */
export type CurationReceipt = {
  source: Record<string, unknown>;
  screenshots: number;
  evidence: string;
  backup: string | null;
  evidencePath: string;
  screensDirectory: string;
};

/**
 * The evidence record curation writes to `capture-evidence.json`, rebuilt
 * from a passed run's manifest with every hash and URL re-checked.
 */
export type CurationEvidence = {
  schemaVersion: number;
  curatedAt: string;
  source: Record<string, unknown>;
  fixtures: FixtureFile[];
  actions: CaptureAction[];
  resources: CaptureResource[];
  screenshots: CuratedScreenshot[];
};

/** Everything `installStagedOutputs` needs to move staged output into place. */
export type StagedCuration = {
  root: string;
  publicDirectory: string;
  stage: string;
  existing: readonly string[];
  manifestPath: string;
  manifestSha256: string;
  source: Record<string, unknown>;
  screenshotCount: number;
};
