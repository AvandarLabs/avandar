import { ensureFixtureDataset } from "../../ensureFixtureDataset";
import { makeWorkspaceUrlFromRoute } from "../casesMapHelpers";
import { openCaseRecords } from "./openCaseRecords";
import { openFirstRecord } from "./openFirstRecord";
import { openOrCreateCaseType } from "./openOrCreateCaseType";
import { readFixtureRows } from "./readFixtureRows";
import { verifyRecordCount } from "./verifyRecordCount";
import type { FlowContext } from "../../captureFlows.types";

async function _getCaseSources(
  context: FlowContext,
): Promise<Parameters<typeof openOrCreateCaseType>[0]["sources"]> {
  // Each dataset step drives the one recording page, so they run in order.
  return {
    cases: await ensureFixtureDataset({
      context,
      key: "cases",
    }),
    visits: await ensureFixtureDataset({
      context,
      key: "visits",
    }),
  };
}
/**
 * The `cases` capture flow: creates or reuses a dataset-backed case type,
 * syncs only empty records, and captures a record's real fields.
 *
 * `AvandarCaptureFlows` loads it on demand as the `cases` flow that
 * `pnpm capture` runs.
 */
export async function runCasesFlow(context: FlowContext): Promise<void> {
  makeWorkspaceUrlFromRoute({
    context,
    suffix: "ontology-designer",
  });
  const sources = await _getCaseSources(context);
  const [expectedRows, expectedVisits, isNew] = await Promise.all([
    readFixtureRows({
      context,
      key: "cases",
    }),
    readFixtureRows({
      context,
      key: "visits",
    }),
    context.step("cases-create-type", () => {
      return openOrCreateCaseType({
        context,
        sources,
      });
    }),
  ]);
  await context.checkpoint("cases-type");
  await context.step("cases-sync-records", () => {
    return openCaseRecords({ context, isNew });
  });
  await context.step("cases-verify-240-records", () => {
    return verifyRecordCount({
      context,
      expectedRows,
    });
  });
  await context.checkpoint("cases-records");
  await context.step("cases-open-record", () => {
    return openFirstRecord({
      context,
      options: { sources, expectedRows, expectedVisits },
    });
  });
  await context.checkpoint("cases-record-detail");
}
