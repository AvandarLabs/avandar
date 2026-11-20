import { ensureFixtureDataset } from "../../ensureFixtureDataset";
import { makeWorkspaceUrlFromRoute } from "../casesMapHelpers";
import { openCaseRecords } from "./openCaseRecords";
import { openFirstRecord } from "./openFirstRecord";
import { openOrCreateCaseType } from "./openOrCreateCaseType";
import { readFixtureRows } from "./readFixtureRows";
import { verifyRecordCount } from "./verifyRecordCount";
import type { FlowContext } from "../../captureFlows.types";

/**
 * The `cases` capture flow: creates or reuses a dataset-backed case type,
 * syncs only empty records, and captures a record's real fields.
 *
 * `AvandarCaptureFlows` loads it on demand as the `cases` flow that
 * `pnpm capture` runs.
 */
export async function runCasesFlow(context: FlowContext): Promise<void> {
  makeWorkspaceUrlFromRoute(context, "ontology-designer");
  // Each dataset step drives the one recording page, so they run in order.
  const sources = {
    cases: await ensureFixtureDataset(context, "cases"),
    visits: await ensureFixtureDataset(context, "visits"),
  };
  const [expectedRows, expectedVisits, isNew] = await Promise.all([
    readFixtureRows(context, "cases"),
    readFixtureRows(context, "visits"),
    context.step("cases-create-type", () => {
      return openOrCreateCaseType(context, sources);
    }),
  ]);
  await context.checkpoint("cases-type");
  await context.step("cases-sync-records", () => {
    return openCaseRecords({ context, isNew });
  });
  await context.step("cases-verify-240-records", () => {
    return verifyRecordCount(context, expectedRows);
  });
  await context.checkpoint("cases-records");
  await context.step("cases-open-record", () => {
    return openFirstRecord(context, { sources, expectedRows, expectedVisits });
  });
  await context.checkpoint("cases-record-detail");
}
