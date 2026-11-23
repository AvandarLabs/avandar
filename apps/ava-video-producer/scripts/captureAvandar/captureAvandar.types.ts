import type { FixtureFile } from "../captureLib/CaptureFileSafety";
import type { Browser, Page } from "@playwright/test";

/** A file a capture wrote, by its path inside the run folder and its hash. */
export type CaptureArtifact = { path: string; sha256: string };

/** One recorded flow step and the URLs and times around it. */
export type CaptureAction = {
  id: string;
  flowId: string;
  status: string;
  sourceUrl: string;
  startedAtMs: number;
  videoStartedAtMs: number | undefined;
  endedAtMs?: number;
  videoEndedAtMs?: number | undefined;
  resultUrl?: string;
  error?: string;
};

/** One evidence checkpoint: a screenshot and, optionally, visible text. */
export type CaptureCheckpoint = {
  id: string;
  flowId: string;
  status: string;
  sourceUrl: string;
  startedAtMs: number;
  atMs?: number;
  videoAtMs?: number | undefined;
  completedAtMs?: number;
  screenshot?: CaptureArtifact;
  text?: CaptureArtifact;
  error?: string;
};

/** One capture flow's progress through a run. */
export type CaptureFeature = {
  id: string;
  status: string;
  startedAtMs?: number;
  endedAtMs?: number;
  videoStartedAtMs?: number | undefined;
  videoEndedAtMs?: number | undefined;
};

/** A request the network guard blocked or suppressed, with its timing. */
export type BlockedRequest = {
  sourceUrl: string;
  method: string;
  reason: string;
  atMs: number;
  videoAtMs: number | undefined;
};

/**
 * A product resource a flow created, such as a dataset, recorded for
 * review.
 */
export type CaptureResource = {
  flowId: string;
  kind: string;
  id: string;
  name: string;
};

/** The pixel size of the capture browser's viewport. */
export type CaptureViewport = { width: number; height: number };

/** What a flow passes to `recordResource`: a resource without its flow. */
export type CaptureResourceInput = Pick<CaptureResource, "kind" | "id"> & {
  name?: string;
};

/** The run inputs a manifest records, so a reviewer can reproduce the run. */
export type CaptureManifestInputs = {
  baseUrl: string;
  workspace: string;
  runLabel: string;
  flowIds: string[];
  viewport: CaptureViewport;
  fixtureDir: string;
  checkpointSettleMs: number;
};

/** The network policy a run enforced and every request it refused. */
export type CaptureNetworkPolicy = {
  scope: string;
  serviceWorkers: string;
  blockedRequests: BlockedRequest[];
  suppressedRequests: BlockedRequest[];
};

/** The clock a run's timings use and where its recording starts. */
export type CaptureTiming = {
  unit: string;
  clock: string;
  recordingOrigin: string;
  exactFrameAlignment: boolean;
  recordingStartedAtMs?: number;
};

/** The recorded video's status, frame rate, and saved artifact. */
export type CaptureVideoRecord = {
  status: string;
  originalFps: number;
  fpsBasis: string;
  normalizationRequired: boolean;
  rawPath: string | undefined;
  path?: string;
  sha256?: string;
};

/** The options one capture login receives. */
export type CaptureLoginOptions = {
  page: Page;
  baseUrl: string;
  workspace: string;
  email: string;
  password: string;
};

/**
 * The evidence record a capture run writes to `manifest.json` as it goes.
 * Reviewers read it before using footage to support a claim.
 */
export type CaptureManifest = {
  schemaVersion: number;
  runId: string;
  status: string;
  startedAt: string;
  inputs: CaptureManifestInputs;
  fixtures: FixtureFile[];
  browser: {
    engine: string;
    version: string | undefined;
    playwrightVersion: string;
  };
  authentication: { status: string; recorded: boolean; completedAtMs?: number };
  networkPolicy: CaptureNetworkPolicy;
  timing: CaptureTiming;
  features: CaptureFeature[];
  actions: CaptureAction[];
  checkpoints: CaptureCheckpoint[];
  resources: CaptureResource[];
  video: CaptureVideoRecord;
  errors: Array<{ stage: string; message: string; atMs: number }>;
  finishedAt?: string;
  durationMs?: number;
};

/** What `runCapture` returns, and what `CaptureRunError` carries on failure. */
export type CaptureResult = {
  status: string;
  runDir: string;
  manifestPath: string;
  manifest: CaptureManifest;
};

/** The page and recording origin a run updates as it progresses. */
export type LiveCapture = {
  page: Page | undefined;
  recordingOrigin: number | undefined;
};

/** Options for one evidence checkpoint. */
export type CheckpointOptions = { text?: boolean };

/**
 * What a capture flow receives: the recording page, its workspace, and the
 * evidence recorders scoped to that flow.
 */
export type CaptureFlowContext = {
  page: Page;
  baseUrl: string;
  workspace: string;
  fixtureDir: string;
  runLabel: string;
  state: Record<string, unknown>;
  checkpoint: (id: string, options?: CheckpointOptions) => Promise<string>;
  step: <T>(id: string, action: () => Promise<T>) => Promise<T>;
  recordResource: (
    resource: Readonly<CaptureResourceInput>,
  ) => Promise<CaptureResource>;
};

/** One capture flow: a trusted local script that drives the recording page. */
export type CaptureFlow = (context: CaptureFlowContext) => Promise<void>;

/** The credentials and destination a capture login uses. */
export type CaptureLogin = (
  options: Readonly<CaptureLoginOptions>,
) => Promise<void>;

/** Everything `runCapture` accepts. Omitted values take local defaults. */
export type CaptureOptions = {
  root?: string;
  baseUrl?: string;
  workspace?: string;
  runLabel?: string;
  flowIds?: string[];
  flowMap?: Record<string, CaptureFlow>;
  viewport?: CaptureViewport;
  email?: string;
  password?: string;
  actionTimeoutMs?: number;
  checkpointSettleMs?: number;
  fixtureDir?: string;
  fixtureFiles?: string[];
  browser?: Browser;
  login?: CaptureLogin;
};
