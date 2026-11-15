import { readFile } from "node:fs/promises";
import path from "node:path";
import { expect } from "@playwright/test";
import {
  UUID,
  WAIT,
  closeChat,
  dataset,
  idFromRoute,
  localRoute,
  resource,
  selectOption,
} from "./shared.mjs";

async function addCaseField(page, source, column) {
  await page.getByRole("button", { name: source.name, exact: true }).click();
  const sourceGroup = page
    .getByRole("heading", { name: source.name, exact: true })
    .locator("..");
  await sourceGroup.getByText(column, { exact: true }).click();
  await page
    .getByRole("button", { name: "Add column as a field", exact: true })
    .click();
  // A selected source column disappears from the source picker and becomes a field.
  await expect(
    sourceGroup.getByRole("radio", { name: column, exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("radio", { name: column, exact: true }).last(),
  ).toBeAttached();
}

async function configureCaseFields(ctx, sources) {
  const { page } = ctx;
  await page
    .getByRole("switch", {
      name: "Some data should come from existing datasets",
      exact: true,
    })
    .check();
  for (const column of ["case_label", "district_name", "referral_status"]) {
    await addCaseField(page, sources.cases, column);
  }
  await addCaseField(page, sources.visits, "supply_kits_delivered");
  // Mantine's segmented-control label is the visible target for its radio input.
  const kitsRadio = page
    .getByRole("radio", { name: "supply_kits_delivered", exact: true })
    .last();
  await kitsRadio
    .locator("..")
    .getByText("supply_kits_delivered", { exact: true })
    .click();
  await selectOption(
    page,
    page.getByPlaceholder("Select rule (e.g. most frequent)"),
    "Get a sum of the values",
  );
  for (const source of [sources.cases, sources.visits]) {
    await selectOption(
      page,
      page.getByRole("combobox", { name: source.name, exact: true }),
      "case_id",
    );
  }
  await selectOption(
    page,
    page.getByRole("combobox", {
      name: /What field should be used as a .*'s name\?/,
    }),
    "case_label",
  );
}

async function openOrCreateCaseType(ctx, sources) {
  const { page, state } = ctx;
  const name =
    state.caseType?.name ??
    `Video - Harborfield response case - ${ctx.runLabel}`;
  if (state.caseType?.id) {
    await page.goto(localRoute(ctx, `ontology-designer/${state.caseType.id}`));
    await page
      .getByRole("button", { name: "View records", exact: true })
      .waitFor();
    await resource(ctx, "case-type", state.caseType);
    return false;
  }
  await page.goto(localRoute(ctx, "ontology-designer"));
  await closeChat(page);
  await page
    .getByRole("button", {
      name: /New case type Describe what you want to manage/,
    })
    .waitFor({ timeout: WAIT });
  const existing = page.getByRole("button", {
    name: `Open ${name}`,
    exact: true,
  });
  if ((await existing.count()) > 1)
    throw new Error(`More than one case type has the capture name: ${name}`);
  if (await existing.count()) {
    await existing.click();
    await page.waitForURL(new RegExp(`/ontology-designer/${UUID}(?:\\?|$)`));
    state.caseType = {
      id: idFromRoute(page, "ontology-designer"),
      name,
      createdByRun: false,
    };
    await resource(ctx, "case-type", state.caseType);
    return false;
  }
  // The visible new-type card starts AI chat. This existing manual route is intentional.
  await page.goto(localRoute(ctx, "ontology-designer/concept-creator"));
  await page
    .getByRole("textbox", { name: "Case type name", exact: true })
    .fill(name);
  await page
    .getByRole("textbox", { name: "Description", exact: true })
    .fill(
      "Fictional Harborfield response records linked to visit activity by case_id.",
    );
  await configureCaseFields(ctx, sources);
  await page
    .getByRole("combobox", { name: sources.cases.name, exact: true })
    .scrollIntoViewIfNeeded();
  await ctx.checkpoint("cases-source-fields");
  await page
    .getByRole("button", { name: "Create case type", exact: true })
    .click();
  await page.waitForURL(new RegExp(`/ontology-designer/${UUID}(?:\\?|$)`), {
    timeout: WAIT,
  });
  state.caseType = {
    id: idFromRoute(page, "ontology-designer"),
    name,
    createdByRun: true,
    synced: false,
  };
  await resource(ctx, "case-type", state.caseType);
  await page
    .getByRole("button", { name: "Sync records", exact: true })
    .waitFor();
  return true;
}

function recordLinks(page, caseTypeId) {
  return page.locator(`a[href*="/individual-manager/${caseTypeId}/"]`);
}

async function fixtureRows(ctx, key) {
  const csv = await readFile(path.join(ctx.fixtureDir, `${key}.csv`), "utf8");
  // These two generated fixtures contain no quoted fields or embedded delimiters.
  if (csv.includes('"'))
    throw new Error(
      `Update the fixture reader for quoted fields in ${key}.csv.`,
    );
  const [header, ...rows] = csv
    .trim()
    .split(/\r?\n/)
    .map((line) => line.split(","));
  return rows.map((values) =>
    Object.fromEntries(header.map((column, index) => [column, values[index]])),
  );
}

async function verifyRecordCount(ctx, expectedRows) {
  const links = recordLinks(ctx.page, ctx.state.caseType.id);
  const viewport = ctx.page
    .locator(".mantine-ScrollArea-viewport")
    .filter({ has: links.first() });
  await expect(viewport).toHaveCount(1);
  const records = new Map();
  for (let scroll = 0; scroll < 80; scroll += 1) {
    for (const item of await links.evaluateAll((elements) =>
      elements.map((element) => ({
        href: element.getAttribute("href"),
        name: element.textContent.trim(),
      })),
    ))
      records.set(item.href, item.name);
    const atBottom = await viewport.evaluate(
      (element) =>
        element.scrollTop + element.clientHeight >= element.scrollHeight - 1,
    );
    const loadingMore = ctx.page.getByText("Loading more...", { exact: true });
    if (
      atBottom &&
      records.size >= expectedRows.length &&
      !(await loadingMore.count())
    )
      break;
    const renderedRecords = () =>
      links.evaluateAll((elements) =>
        elements.map((element) => element.getAttribute("href")).join("|"),
      );
    const before = await renderedRecords();
    // This scrolls the rendered record pane, without reading application state.
    await viewport.evaluate((element) =>
      element.scrollBy(0, Math.floor(element.clientHeight * 0.65)),
    );
    // A boundary may fetch another page before the scrollbar can move again.
    await expect.poll(renderedRecords, { timeout: WAIT }).not.toBe(before);
  }
  expect([...records.values()].sort()).toEqual(
    expectedRows.map((row) => row.case_label).sort(),
  );
  ctx.state.caseType.observedRecordCount = records.size;
  // The current product repeats pagination boundary keys in its virtual list.
  // Reload the same records route after proving unique labels, restoring a clean view.
  await ctx.page.reload();
  await expect(
    links.filter({ hasText: expectedRows[0].case_label }).first(),
  ).toBeVisible({ timeout: WAIT });
}

async function openCaseRecords(ctx, isNew) {
  const { page, state } = ctx;
  let shouldSync = isNew;
  if (!isNew) {
    await page
      .getByRole("button", { name: "View records", exact: true })
      .click();
    const firstRecord = recordLinks(page, state.caseType.id).first();
    const empty = page.getByText("No records yet", { exact: true });
    await expect(firstRecord.or(empty).first()).toBeVisible({ timeout: WAIT });
    shouldSync = await empty.isVisible();
  }
  if (shouldSync) {
    // Sync resets record IDs and assignments. Never repeat it for populated records.
    if (!isNew)
      await page.goto(
        localRoute(ctx, `ontology-designer/${state.caseType.id}`),
      );
    await page
      .getByRole("button", { name: "Sync records", exact: true })
      .click();
    await page
      .getByText(`Finished syncing ${state.caseType.name} records`, {
        exact: true,
      })
      .waitFor({ timeout: WAIT });
    state.caseType.synced = true;
    await page
      .getByRole("button", { name: "View records", exact: true })
      .click();
  }
  await recordLinks(page, state.caseType.id).first().waitFor({ timeout: WAIT });
}

/** Creates or reuses a dataset-backed case type, syncs only empty records, and captures real fields. */
export async function cases(ctx) {
  localRoute(ctx, "ontology-designer");
  ctx.state ??= {};
  const sources = {
    cases: await dataset(ctx, "cases"),
    visits: await dataset(ctx, "visits"),
  };
  const expectedRows = await fixtureRows(ctx, "cases");
  const expectedVisits = await fixtureRows(ctx, "visits");
  let isNew = false;
  await ctx.step("cases-create-type", async () => {
    isNew = await openOrCreateCaseType(ctx, sources);
  });
  await ctx.checkpoint("cases-type");
  await ctx.step("cases-sync-records", async () => {
    await openCaseRecords(ctx, isNew);
  });
  await ctx.step("cases-verify-240-records", async () => {
    await verifyRecordCount(ctx, expectedRows);
  });
  await ctx.checkpoint("cases-records");
  await ctx.step("cases-open-record", async () => {
    const first = recordLinks(ctx.page, ctx.state.caseType.id).first();
    const name = (await first.innerText()).trim();
    const expected = expectedRows.find((row) => row.case_label === name);
    if (!expected)
      throw new Error(`Record label is absent from the fixture: ${name}`);
    const kits = expectedVisits
      .filter((visit) => visit.case_id === expected.case_id)
      .reduce((sum, visit) => sum + Number(visit.supply_kits_delivered), 0);
    await first.click();
    await ctx.page.getByRole("heading", { name, exact: true }).waitFor();
    await ctx.page
      .getByRole("heading", { name: "Details", exact: true })
      .waitFor();
    for (const field of [
      "case_label",
      "district_name",
      "referral_status",
      "supply_kits_delivered",
    ]) {
      const item = ctx.page
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
      ctx.page
        .getByRole("listitem")
        .filter({ hasText: /^case_id\s/ })
        .locator("p:last-child"),
    ).toHaveText([expected.case_id, expected.case_id]);
    ctx.state.caseType.recordName = name;
    ctx.state.caseType.recordUrl = ctx.page.url();
    const pane = ctx.page
      .locator(".mantine-ScrollArea-viewport")
      .filter({ has: recordLinks(ctx.page, ctx.state.caseType.id).first() });
    await pane.evaluate((element) => element.scrollTo(0, 0));
    await expect(
      recordLinks(ctx.page, ctx.state.caseType.id)
        .filter({ hasText: name })
        .first(),
    ).toBeInViewport();
  });
  await ctx.checkpoint("cases-record-detail");
}
