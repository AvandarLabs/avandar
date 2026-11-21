import type { CaptureManifest, CaptureResult } from "./captureAvandar.types";

/**
 * Raised when a capture run finishes without passing. It carries the
 * manifest, so a caller can report the failure and point a reviewer at it.
 */
export class CaptureRunError extends Error {
  status: string;
  runDir: string;
  manifestPath: string;
  manifest: CaptureManifest;

  /** Creates a capture failure with the run result and review manifest. */
  constructor(result: Readonly<CaptureResult>) {
    super(`Capture failed. Review ${result.manifestPath}`);
    this.name = "CaptureRunError";
    this.status = result.status;
    this.runDir = result.runDir;
    this.manifestPath = result.manifestPath;
    this.manifest = result.manifest;
  }
}
