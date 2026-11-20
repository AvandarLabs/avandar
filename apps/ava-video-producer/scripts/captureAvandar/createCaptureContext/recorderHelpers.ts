import type { CaptureRecorderState } from "./createCaptureContext.types";
import type { Page } from "@playwright/test";

/**
 * Claims a flow-qualified id, throwing when the flow already used it. The
 * checkpoint and step recorders call it so one flow cannot reuse an id.
 */
export function claimQualifiedId({
  usedIds,
  qualifiedId,
  kind,
}: Readonly<{
  usedIds: Set<string>;
  qualifiedId: string;
  kind: string;
}>): void {
  if (usedIds.has(qualifiedId)) {
    throw new Error(`Duplicate ${kind}: ${qualifiedId}`);
  }
  usedIds.add(qualifiedId);
}

/**
 * Gets the live recording page from a run, which exists once recording
 * starts. Throws before then.
 */
export function getPageFromRun(run: Readonly<CaptureRecorderState>): Page {
  if (!run.live.page) {
    throw new Error("Capture evidence needs the recording page");
  }
  return run.live.page;
}
