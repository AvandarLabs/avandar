import type {
  CaptureFeature,
  CaptureFlow,
  CaptureViewport,
  LiveCapture,
} from "./captureAvandar.types";
import type { CaptureContext } from "./createCaptureContext/createCaptureContext.types";
import type { Browser, BrowserContext, Video } from "@playwright/test";

/** Capture options after validation and defaults. */
export type CaptureSettings = {
  root: string;
  baseUrl: string;
  workspace: string;
  runLabel: string;
  flowIds: string[];
  flows: Record<string, CaptureFlow>;
  viewport: CaptureViewport;
  email: string;
  password: string;
  timeout: number;
  checkpointSettleMs: number;
};

/** The browser resources one run opens, so teardown can close each one. */
export type CaptureSession = {
  browser: Browser | undefined;
  ownsBrowser: boolean;
  loginContext: BrowserContext | undefined;
  recordingContext: BrowserContext | undefined;
  video: Video | undefined;
  activeFeature: CaptureFeature | undefined;
};

/** One run's settings, evidence recorders, and live browser state. */
export type CaptureRun = {
  settings: CaptureSettings;
  context: CaptureContext;
  session: CaptureSession;
  live: LiveCapture;
  runDir: string;
  secrets: string[];
};
