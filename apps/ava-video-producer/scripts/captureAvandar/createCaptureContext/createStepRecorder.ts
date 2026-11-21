import { CaptureSanitization } from "../../captureLib/CaptureSanitization";
import { CaptureUrlSafety } from "../../captureLib/CaptureUrlSafety/CaptureUrlSafety";
import { claimQualifiedId, getPageFromRun } from "./recorderHelpers";
import type { CaptureAction } from "../captureAvandar.types";
import type {
  CaptureContext,
  CaptureRecorderState,
} from "./createCaptureContext.types";

function _validateStep({
  flowId,
  id,
  action,
  actionIds,
}: Readonly<{
  flowId: string;
  id: string;
  action: unknown;
  actionIds: Set<string>;
}>): void {
  CaptureUrlSafety.validateId({
    value: id,
    name: "step id",
  });
  if (typeof action !== "function") {
    throw new Error("step needs an action callback");
  }
  claimQualifiedId({
    usedIds: actionIds,
    qualifiedId: `${flowId}-${id}`,
    kind: "step",
  });
}
/**
 * Creates the recorder behind `CaptureContext.step`: it runs one flow action
 * and records its timing, URLs, and outcome in the manifest.
 * `createCaptureContext` builds one per run.
 */
export function createStepRecorder(
  run: CaptureRecorderState,
): CaptureContext["step"] {
  const actionIds = new Set<string>();
  return async ({ flowId, id, action }) => {
    _validateStep({ flowId, id, action, actionIds });
    run.assertPolicy();
    const actionEntry: CaptureAction = {
      id,
      flowId,
      status: "running",
      sourceUrl: run.manifestUrl(getPageFromRun(run).url()),
      startedAtMs: run.elapsed(),
      videoStartedAtMs: run.videoElapsed(),
    };
    run.manifest.actions.push(actionEntry);
    await run.persist();
    try {
      const result = await action();
      run.assertPolicy();
      actionEntry.status = "passed";
      return result;
    } catch (error) {
      actionEntry.status = "failed";
      actionEntry.error = CaptureSanitization.makeRedactedTextFromValue({
        value: error instanceof Error ? error.message : error,
        secrets: run.secrets,
      });
      throw error;
    } finally {
      actionEntry.endedAtMs = run.elapsed();
      actionEntry.videoEndedAtMs = run.videoElapsed();
      actionEntry.resultUrl = run.manifestUrl(getPageFromRun(run).url());
      await run.persist();
    }
  };
}
