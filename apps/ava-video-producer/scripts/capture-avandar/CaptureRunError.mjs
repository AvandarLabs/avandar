/** Raised when a capture run finishes without passing; carries the manifest for review. */
export class CaptureRunError extends Error {
  /** @param {import("./createCaptureContext.mjs").CaptureResult} result */
  constructor(result) {
    super(`Capture failed. Review ${result.manifestPath}`);
    this.name = "CaptureRunError";
    this.status = result.status;
    this.runDir = result.runDir;
    this.manifestPath = result.manifestPath;
    this.manifest = result.manifest;
  }
}
