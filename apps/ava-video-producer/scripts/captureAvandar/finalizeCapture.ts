import { join } from "node:path";
import { getArtifactPathFromRunPath } from "../captureLib/manifestHelpers";
import { makeRedactedTextFromValue } from "../captureLib/sanitizeHelpers";
import { getSha256FromFile } from "../lib/getSha256FromFile";
import type { CaptureRun } from "./captureRun.types";

function _recordTeardownError({
  run,
  stage,
  error,
}: Readonly<{
  run: CaptureRun;
  stage: string;
  error: unknown;
}>): void {
  run.context.manifest.status = "failed";
  run.context.manifest.errors.push({
    stage,
    message: makeRedactedTextFromValue({
      value: error instanceof Error ? error.message : error,
      secrets: run.secrets,
    }),
    atMs: run.context.elapsed(),
  });
}

/** Closes the recording context, then saves and hashes its video. */
async function _saveVideo(run: CaptureRun): Promise<void> {
  const { manifest } = run.context;
  const { recordingContext, video } = run.session;
  if (!recordingContext) {
    manifest.video.status = "not-recorded";
    return;
  }
  try {
    // Finalize the stream first. saveAs() is never awaited on a live context.
    await recordingContext.close();
    if (!video) {
      throw new Error("Recording context produced no video handle");
    }
    const savedVideo = join(run.runDir, "capture.webm");
    await video.saveAs(savedVideo);
    manifest.video.status = "saved";
    manifest.video.path = getArtifactPathFromRunPath(run.runDir, savedVideo);
    manifest.video.sha256 = await getSha256FromFile(savedVideo);
    manifest.video.rawPath = await (async () => {
      try {
        return getArtifactPathFromRunPath(run.runDir, await video.path());
      } catch {
        return null;
      }
    })();
  } catch (error) {
    manifest.video.status = "failed";
    _recordTeardownError({ run, stage: "video-finalization", error });
  }
}

/**
 * Closes everything a capture run opened, saves its video, and writes the
 * final manifest. `runCapture` calls it once, whether the run passed or not.
 */
export async function finalizeCapture(run: CaptureRun): Promise<void> {
  const { manifest } = run.context;
  const { loginContext, browser, ownsBrowser } = run.session;
  if (loginContext) {
    await loginContext
      .close()
      .catch((error) =>
        _recordTeardownError({ run, stage: "login-context-close", error }),
      );
  }
  await _saveVideo(run);
  if (ownsBrowser && browser) {
    await browser
      .close()
      .catch((error) =>
        _recordTeardownError({ run, stage: "browser-close", error }),
      );
  }
  // A guard rejection arriving during teardown must still invalidate the run.
  if (manifest.networkPolicy.blockedRequests.length) {
    manifest.status = "failed";
  }
  manifest.finishedAt = new Date().toISOString();
  manifest.durationMs = run.context.elapsed();
  await run.context.persist();
}
