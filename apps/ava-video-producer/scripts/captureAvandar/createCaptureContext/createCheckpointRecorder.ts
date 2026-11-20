import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { getArtifactPathFromRunPath } from "../../captureLib/manifestHelpers";
import { makeRedactedTextFromValue } from "../../captureLib/sanitizeHelpers";
import { validateId } from "../../captureLib/urlSafetyHelpers";
import { getSha256FromFile } from "../../lib/getSha256FromFile";
import { claimQualifiedId, getPageFromRun } from "./recorderHelpers";
import type {
  CaptureCheckpoint,
  CheckpointOptions,
} from "../captureAvandar.types";
import type {
  CaptureContext,
  CaptureRecorderState,
} from "./createCaptureContext.types";
import type { Page } from "@playwright/test";

/** What a checkpoint recorder needs to fill one running checkpoint entry. */
type CheckpointCompletion = {
  run: CaptureRecorderState;
  page: Page;
  entry: CaptureCheckpoint;
  qualifiedId: string;
  checkpointOptions: Readonly<CheckpointOptions>;
};

/** Saves the checkpoint screenshot, masking credential fields. */
async function _captureScreenshot({
  run,
  page,
  qualifiedId,
}: Readonly<{
  run: Readonly<CaptureRecorderState>;
  page: Page;
  qualifiedId: string;
}>): Promise<string> {
  const imagePath = join(run.runDir, "screens", `${qualifiedId}.png`);
  await page.screenshot({
    path: imagePath,
    fullPage: false,
    animations: "disabled",
    mask: [
      page.locator(
        'input[type="password"],input[type="email"],[autocomplete="current-password"],[autocomplete="new-password"]',
      ),
      page.getByText(run.email, { exact: true }),
    ],
  });
  return imagePath;
}

/**
 * Saves the page's visible text, redacted, beside the checkpoint
 * screenshot.
 */
async function _captureVisibleText({
  run,
  page,
  qualifiedId,
}: Readonly<{
  run: Readonly<CaptureRecorderState>;
  page: Page;
  qualifiedId: string;
}>): Promise<string> {
  const textPath = join(run.runDir, "text", `${qualifiedId}.txt`);
  const visibleText = await page.locator("body").innerText();
  await writeFile(
    textPath,
    `${makeRedactedTextFromValue({ value: visibleText, secrets: run.secrets, limit: 50_000 })}\n`,
    { flag: "wx", mode: 0o600 },
  );
  return textPath;
}

/** Fills a running checkpoint entry with its screenshot and optional text. */
async function _completeCheckpoint(
  options: Readonly<CheckpointCompletion>,
): Promise<string> {
  const { run, page, entry, qualifiedId } = options;
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  if (run.checkpointSettleMs) {
    await page.waitForTimeout(run.checkpointSettleMs);
  }
  entry.sourceUrl = run.manifestUrl(page.url());
  entry.atMs = run.elapsed();
  entry.videoAtMs = run.videoElapsed();
  const imagePath = await _captureScreenshot({ run, page, qualifiedId });
  entry.screenshot = {
    path: getArtifactPathFromRunPath(run.runDir, imagePath),
    sha256: await getSha256FromFile(imagePath),
  };
  if (options.checkpointOptions.text === true) {
    const textPath = await _captureVisibleText({ run, page, qualifiedId });
    entry.text = {
      path: getArtifactPathFromRunPath(run.runDir, textPath),
      sha256: await getSha256FromFile(textPath),
    };
  }
  entry.status = "passed";
  entry.completedAtMs = run.elapsed();
  await run.persist();
  return entry.screenshot.path;
}

/**
 * Creates the recorder behind `CaptureContext.checkpoint`: it screenshots the
 * recording page, optionally saves its text, and records the result in the
 * manifest. `createCaptureContext` builds one per run.
 */
export function createCheckpointRecorder(
  run: CaptureRecorderState,
): CaptureContext["checkpoint"] {
  const checkpointIds = new Set<string>();
  return async ({ flowId, id, checkpointOptions = {} }) => {
    validateId(id, "checkpoint id");
    const qualifiedId = `${flowId}-${id}`;
    claimQualifiedId({
      usedIds: checkpointIds,
      qualifiedId,
      kind: "checkpoint",
    });
    run.assertPolicy();
    const page = getPageFromRun(run);
    const entry: CaptureCheckpoint = {
      id,
      flowId,
      status: "running",
      sourceUrl: run.manifestUrl(page.url()),
      startedAtMs: run.elapsed(),
    };
    run.manifest.checkpoints.push(entry);
    await run.persist();
    try {
      return await _completeCheckpoint({
        run,
        page,
        entry,
        qualifiedId,
        checkpointOptions,
      });
    } catch (error) {
      entry.status = "failed";
      entry.error = makeRedactedTextFromValue({
        value: error instanceof Error ? error.message : error,
        secrets: run.secrets,
      });
      await run.persist();
      throw error;
    }
  };
}
