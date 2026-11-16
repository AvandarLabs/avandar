import { ensureDataset } from "./ensureDataset";
import type { FlowContext, FlowRecord } from "./captureFlows.types";

/**
 * Gets the fixture dataset a flow needs, uploading it on first use, and
 * caches it on the run state.
 *
 * Called by the explorer flow in `AvandarCaptureFlows`, `runCasesFlow`, and
 * `runMapFlow`, so every flow in a run shares one upload of each dataset.
 */
export async function ensureFixtureDataset(
  ctx: FlowContext,
  key: string,
): Promise<FlowRecord> {
  return ctx.state.datasets?.[key] ?? ensureDataset(ctx, key);
}
