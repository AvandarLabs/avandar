import type { FlowCaseType, FlowContext } from "../../captureFlows.types";

/**
 * Gets the run's case type, which exists once the create step has run.
 * Throws when the cases flow has not recorded one yet.
 *
 * Called by the record steps of `runCasesFlow`: `openCaseRecords`,
 * `verifyRecordCount`, and `openFirstRecord`.
 */
export function getCaseType(context: Readonly<FlowContext>): FlowCaseType {
  if (!context.state.caseType) {
    throw new Error("The cases flow needs its case type first.");
  }
  return context.state.caseType;
}
