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
export async function runCasesFlow(ctx: FlowContext): Promise<void> {
  makeWorkspaceUrlFromRoute(ctx, "ontology-designer");
  // Each dataset step drives the one recording page, so they run in order.
  const sources = {
    cases: await ensureFixtureDataset(ctx, "cases"),
    visits: await ensureFixtureDataset(ctx, "visits"),
  };
  const [expectedRows, expectedVisits, isNew] = await Promise.all([
    readFixtureRows(ctx, "cases"),
    readFixtureRows(ctx, "visits"),
    ctx.step("cases-create-type", () => openOrCreateCaseType(ctx, sources)),
  ]);
  await ctx.checkpoint("cases-type");
  await ctx.step("cases-sync-records", () => openCaseRecords(ctx, isNew));
  await ctx.step("cases-verify-240-records", () =>
    verifyRecordCount(ctx, expectedRows),
  );
  await ctx.checkpoint("cases-records");
  await ctx.step("cases-open-record", () =>
    openFirstRecord(ctx, { sources, expectedRows, expectedVisits }),
  );
  await ctx.checkpoint("cases-record-detail");
}
