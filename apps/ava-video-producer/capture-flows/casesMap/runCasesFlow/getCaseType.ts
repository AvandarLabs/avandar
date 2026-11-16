import type { FlowCaseType, FlowContext } from "../../captureFlows.types";

/**
 * Gets the run's case type, which exists once the create step has run.
 * Throws when the cases flow has not recorded one yet.
 *
 * Called by the record steps of `runCasesFlow`: `openCaseRecords`,
 * `verifyRecordCount`, and `openFirstRecord`.
 */
export function getCaseType(ctx: Readonly<FlowContext>): FlowCaseType {
  if (!ctx.state.caseType) {
    throw new Error("The cases flow needs its case type first.");
  }
  return ctx.state.caseType;
}
