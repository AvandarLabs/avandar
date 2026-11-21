import type { FixtureInventory } from "../../captureLib/CaptureFileSafety";
import type { NetworkGuardEvent } from "../../captureLib/installNetworkGuard";
import type {
  CaptureManifest,
  CaptureResource,
  CaptureResourceInput,
  CaptureViewport,
  CheckpointOptions,
  LiveCapture,
} from "../captureAvandar.types";

/** The run inputs `createCaptureContext` records in the manifest. */
export type CaptureContextOptions = {
  runDir: string;
  baseUrl: string;
  workspace: string;
  runLabel: string;
  flowIds: string[];
  viewport: CaptureViewport;
  fixtures: FixtureInventory;
  checkpointSettleMs: number;
  secrets: string[];
  email: string;
  playwrightVersion: string;
  startedAtMs: number;
  live: LiveCapture;
};

/** State and helpers every evidence recorder in one run shares. */
export type CaptureRecorderState = CaptureContextOptions & {
  manifest: CaptureManifest;
  elapsed: () => number;
  videoElapsed: () => number | undefined;
  manifestUrl: (value: string) => string;
  persist: () => Promise<void>;
  assertPolicy: () => void;
};

/**
 * The manifest, its path, and the recorders a capture run uses. `runCapture`
 * reads the manifest through it and gives each flow its scoped recorders.
 */
export type CaptureContext = Pick<
  CaptureRecorderState,
  | "manifest"
  | "elapsed"
  | "videoElapsed"
  | "manifestUrl"
  | "persist"
  | "assertPolicy"
> & {
  manifestPath: string;
  reportBlocked: (event: Readonly<NetworkGuardEvent>) => Promise<void>;
  reportSuppressed: (event: Readonly<NetworkGuardEvent>) => Promise<void>;
  checkpoint: (
    options: Readonly<{
      flowId: string;
      id: string;
      checkpointOptions?: Readonly<CheckpointOptions>;
    }>,
  ) => Promise<string>;
  step: <T>(
    options: Readonly<{
      flowId: string;
      id: string;
      action: () => Promise<T>;
    }>,
  ) => Promise<T>;
  recordResource: (
    flowId: string,
    resource: Readonly<CaptureResourceInput>,
  ) => Promise<CaptureResource>;
};
