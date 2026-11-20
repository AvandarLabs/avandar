import { propEq } from "@avandar/utils";
import { expect } from "@playwright/test";
import { WAIT } from "../casesMapHelpers";
import { getCaseType } from "./getCaseType";
import { getRecordLinks } from "./getRecordLinks";
import type { FlowContext } from "../../captureFlows.types";
import type { CaseSources, FixtureRow } from "./runCasesFlow.types";

/** Checks each record field's value and the dataset it is read from. */
async function _expectRecordFields(
  context: Readonly<FlowContext>,
  options: Readonly<{
    expected: FixtureRow;
    kits: number;
    sources: CaseSources;
  }>,
): Promise<void> {
  const { expected, kits, sources } = options;
  // The record fields in their order on screen. Each check reads the one
  // recording page, so they run in order.
  for (const field of [
    "case_label",
    "district_name",
    "referral_status",
    "supply_kits_delivered",
  ]) {
    const item = context.page
      .getByRole("listitem")
      .filter({ hasText: new RegExp(`^${field}\\s`) })
      .first();
    await expect(item).toBeVisible({ timeout: WAIT });
    await expect(item.locator("p").last()).toHaveText(
      field === "supply_kits_delivered" ? String(kits) : expected[field],
    );
    await expect(item).toContainText(
      field === "supply_kits_delivered"
        ? sources.visits.name
        : sources.cases.name,
    );
  }
  await expect(
    context.page
      .getByRole("listitem")
      .filter({ hasText: /^case_id\s/ })
      .locator("p:last-child"),
  ).toHaveText([expected.case_id, expected.case_id]);
}

/** Scrolls the record list back to the top and checks the record is in view. */
async function _scrollRecordIntoView(
  context: FlowContext,
  name: string,
): Promise<void> {
  const links = getRecordLinks(context.page, getCaseType(context).id);
  const pane = context.page
    .locator(".mantine-ScrollArea-viewport")
    .filter({ has: links.first() });
  await pane.evaluate((element) => {
    return element.scrollTo(0, 0);
  });
  await expect(links.filter({ hasText: name }).first()).toBeInViewport();
}

/**
 * Opens the first record and checks its fields against the fixtures.
 *
 * Called by the `cases-open-record` step of `runCasesFlow`.
 */
export async function openFirstRecord(
  context: FlowContext,
  options: Readonly<{
    sources: CaseSources;
    expectedRows: readonly FixtureRow[];
    expectedVisits: readonly FixtureRow[];
  }>,
): Promise<void> {
  const firstRecordLink = getRecordLinks(
    context.page,
    getCaseType(context).id,
  ).first();
  const name = (await firstRecordLink.innerText()).trim();
  const expected = options.expectedRows.find(propEq("case_label", name));
  if (!expected) {
    throw new Error(`Record label is absent from the fixture: ${name}`);
  }
  const kits = options.expectedVisits
    .filter(propEq("case_id", expected.case_id))
    .reduce((sum, visit) => {
      return sum + Number(visit.supply_kits_delivered);
    }, 0);
  await firstRecordLink.click();
  await context.page.getByRole("heading", { name, exact: true }).waitFor();
  await context.page
    .getByRole("heading", { name: "Details", exact: true })
    .waitFor();
  await _expectRecordFields(context, {
    expected,
    kits,
    sources: options.sources,
  });
  getCaseType(context).recordName = name;
  getCaseType(context).recordUrl = context.page.url();
  await _scrollRecordIntoView(context, name);
}
