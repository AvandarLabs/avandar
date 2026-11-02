import path from "node:path";
import { expect } from "@playwright/test";

const fixtureNames = {
  cases: "Video - Harborfield cases",
  visits: "Video - Harborfield visits",
  facilities: "Video - Harborfield facilities",
  districts: "Video - Harborfield districts",
  weekly_reports: "Video - Harborfield weekly reports",
};

async function navigation(page, name, suffix) {
  await page.getByRole("link", { name, exact: true }).click();
  await expect(page).toHaveURL(new RegExp(suffix));
}

async function closeChat(page) {
  const toggle = page.getByRole("button", { name: "Chat", exact: true });
  if (
    (await toggle.count()) &&
    (await toggle.getAttribute("aria-pressed")) === "true"
  ) {
    await toggle.click();
  }
}

async function sourceList(ctx, showImport = false) {
  const { page, baseUrl, workspace } = ctx;
  await page.goto(
    `${baseUrl}/${workspace}/data-manager${showImport ? "/data-import" : ""}`,
  );
  await page
    .getByRole("heading", { name: "Data Sources", exact: true })
    .waitFor();
  if (showImport)
    await page.getByRole("tabpanel", { name: "Upload", exact: true }).waitFor();
  // The visible count is absent while loading, including when cached requests do not fire.
  const count = page
    .getByRole("heading", { name: "Datasets", exact: true })
    .locator("..")
    .locator("p");
  await expect(count).toHaveText(/^\d+$/);
  await expect(
    page.locator(
      `a[href^="/${workspace}/data-manager/"]:not([href$="/data-import"])`,
    ),
  ).toHaveCount(Number(await count.innerText()));
  await closeChat(page);
}

/** Reuses this bundle's datasets and never deletes or edits unrelated local data. */
export async function ensureDataset(ctx, key, { demonstrate = false } = {}) {
  const { page, workspace, fixtureDir, state, step, checkpoint } = ctx;
  state.datasets ??= {};
  const name = fixtureNames[key];
  const stepKey = key.replaceAll("_", "-");
  if (!name) throw new Error(`Unknown fixture: ${key}`);
  await sourceList(ctx, demonstrate);
  const existing = page.getByRole("link", { name, exact: true });
  if ((await existing.count()) > 1)
    throw new Error(`Duplicate fixture dataset name: ${name}`);
  const exists = (await existing.count()) > 0;
  if (!exists || demonstrate) {
    await step(`upload-${stepKey}`, async () => {
      if (!demonstrate) {
        await page.goto(`${ctx.baseUrl}/${workspace}/data-manager/data-import`);
        await page
          .getByRole("tabpanel", { name: "Upload", exact: true })
          .waitFor();
      }
      await page
        .getByRole("tabpanel", { name: "Upload", exact: true })
        .locator('input[type="file"]')
        .setInputFiles(path.join(fixtureDir, `${key}.csv`));
      await page
        .getByPlaceholder("Enter a name for this dataset")
        .waitFor({ timeout: 30000 });
      await page.getByPlaceholder("Enter a name for this dataset").fill(name);
      await page
        .getByPlaceholder("What is in this dataset?")
        .fill(
          "Fictional Harborfield response-coordination data. Reproducible fixtures from avandar-video-agent/demo-data.",
        );
      await page.getByPlaceholder("What is in this dataset?").press("Tab");
      const limit = page
        .getByRole("dialog")
        .filter({ hasText: "Dataset limit reached" });
      if (await limit.count()) {
        if (!exists)
          throw new Error(
            "Local workspace dataset limit reached. Use a workspace with capacity; existing data was preserved.",
          );
        // Previewing an already saved input does not create another dataset.
        await page.keyboard.press("Escape");
        await expect(limit).not.toBeVisible();
      }
      await expect(
        page.getByRole("button", { name: "Save Dataset", exact: true }),
      ).toBeEnabled({ timeout: 30000 });
    });
    if (demonstrate) {
      await page
        .getByText("Dataset ready", { exact: true })
        .waitFor({ state: "hidden", timeout: 15000 });
      await checkpoint("import-preview");
    }
    if (!exists) {
      await step(`save-${stepKey}`, async () => {
        await page
          .getByRole("button", { name: "Save Dataset", exact: true })
          .click();
        await page.waitForURL(
          new RegExp(`/${workspace}/data-manager/[0-9a-f-]+$`),
          { timeout: 30000 },
        );
        await page.getByText(name, { exact: true }).last().waitFor();
      });
    } else {
      await step(`reuse-${stepKey}`, async () => {
        await existing.click();
        await page.waitForURL(
          new RegExp(`/${workspace}/data-manager/[0-9a-f-]+$`),
        );
      });
    }
  } else {
    await existing.click();
    await page.waitForURL(new RegExp(`/${workspace}/data-manager/[0-9a-f-]+$`));
  }
  const id = new URL(page.url()).pathname.split("/").at(-1);
  state.datasets[key] = { id, name };
  await ctx.recordResource?.({ kind: "dataset", id, name });
  if (demonstrate) {
    await page.getByRole("tab", { name: "Metadata", exact: true }).waitFor();
    await expect(page.getByRole("main")).toContainText("240 rows");
    await checkpoint("import-saved");
  }
  return state.datasets[key];
}

async function importFlow(ctx) {
  await ensureDataset(ctx, "cases", { demonstrate: true });
  for (const key of ["visits", "facilities", "districts"])
    await ensureDataset(ctx, key);
}

async function openExplorer(ctx) {
  const dataset =
    ctx.state.datasets?.cases ?? (await ensureDataset(ctx, "cases"));
  await navigation(
    ctx.page,
    "Data Explorer",
    `/${ctx.workspace}/data-explorer`,
  );
  await ctx.page
    .getByRole("heading", { name: "Data Explorer", exact: true })
    .waitFor();
  await closeChat(ctx.page);
  await ctx.page.getByRole("tab", { name: "Query", exact: true }).click();
  const manual = ctx.page
    .getByRole("radiogroup", { name: "Query editor mode" })
    .getByText("Manual", { exact: true });
  if (await manual.count()) await manual.click();
  const source = ctx.page
    .getByRole("tabpanel", { name: "Query", exact: true })
    .getByLabel("Data source", { exact: true });
  await expect(source).toBeEnabled();
  await source.click();
  await ctx.page
    .getByRole("option", { name: dataset.name, exact: true })
    .click();
  await ctx.page
    .getByRole("columnheader", { name: "case_id", exact: true })
    .waitFor({ timeout: 20000 });
  return dataset;
}

async function explorer(ctx) {
  const { page, step, checkpoint } = ctx;
  let dataset;
  await step("explorer-select-source", async () => {
    dataset = await openExplorer(ctx);
  });
  await checkpoint("explorer-records");
  await step("explorer-filter-eastbank", async () => {
    const filters = page.getByTestId("query-filters-field");
    await filters
      .getByRole("button", { name: "+ Condition", exact: true })
      .click();
    await filters
      .getByRole("combobox", { name: "Column", exact: true })
      .click();
    await page
      .getByRole("option", { name: "district_name", exact: true })
      .click();
    await filters.getByTestId("filter-value-scalar").fill("Eastbank");
    await filters.getByTestId("filter-value-scalar").press("Enter");
    await page
      .getByText("1 to 50 of 56", { exact: true })
      .waitFor({ timeout: 20000 });
  });
  await checkpoint("explorer-filtered");
  await step("explorer-aggregate-districts", async () => {
    await page
      .getByRole("radiogroup", { name: "Query editor mode" })
      .getByText("SQL", { exact: true })
      .click();
    await page.getByRole("button", { name: "Edit query", exact: true }).click();
    const sql = `SELECT district_name, count(*) AS recorded_cases FROM "${dataset.id}" GROUP BY district_name ORDER BY recorded_cases DESC`;
    await page
      .getByRole("tabpanel", { name: "Query", exact: true })
      .getByRole("textbox")
      .fill(sql);
    await page
      .getByRole("button", { name: "Re-run query", exact: true })
      .click();
    await page
      .getByRole("columnheader", { name: "recorded_cases", exact: true })
      .waitFor({ timeout: 20000 });
    for (const [district, count] of [
      ["Eastbank", 56],
      ["North Quay", 51],
      ["South Gardens", 40],
      ["Lakeside", 39],
      ["Ridge", 29],
      ["West Marsh", 25],
    ]) {
      await expect(
        page.getByRole("row", {
          name: `${district} ${count.toFixed(2)}`,
          exact: true,
        }),
      ).toBeVisible();
    }
  });
  await checkpoint("explorer-query");
  await step("explorer-bar-chart", async () => {
    await page
      .getByRole("tab", { name: "Visualizations", exact: true })
      .click();
    await page
      .getByRole("combobox", { name: "Visualization Type", exact: true })
      .click();
    await page.getByRole("option", { name: "Bar Chart", exact: true }).click();
    await page
      .getByRole("textbox", { name: "Series label", exact: true })
      .fill("Recorded cases");
    await page
      .getByRole("textbox", { name: "Series label", exact: true })
      .press("Tab");
    await page
      .getByRole("button", { name: "Collapse drawer", exact: true })
      .click();
    await expect(
      page.getByRole("tabpanel", { name: "Visualizations", exact: true }),
    ).not.toBeVisible();
    await expect(page.locator(".recharts-bar-rectangle")).toHaveCount(6);
  });
  ctx.state.explorerUrl = page.url();
  await checkpoint("explorer-chart");
}

async function dashboards(ctx) {
  const { page, step, checkpoint, runLabel } = ctx;
  if (!ctx.state.explorerUrl) await explorer(ctx);
  const name = `Video - Harborfield response overview - ${runLabel}`;
  await step("dashboard-save-view", async () => {
    await page.getByRole("button", { name: "Save", exact: true }).click();
    const fetchedDashboards = page
      .waitForResponse((response) => {
        return (
          new URL(response.url()).pathname.endsWith("/rest/v1/dashboards") &&
          response.request().method() === "GET" &&
          response.ok()
        );
      })
      .then(async (response) => {
        const rows = await response.json();
        if (!Array.isArray(rows))
          throw new Error("Dashboard list did not return a collection.");
        if (rows.length)
          await page
            .getByRole("listbox", { name: "Dashboards", exact: true })
            .waitFor();
        else await page.getByLabel("Dashboard name", { exact: true }).waitFor();
      });
    await page
      .getByRole("menuitem", { name: "Save to dashboard", exact: true })
      .click();
    // The form first assumes no dashboards, then switches to the fetched list.
    // A visible list also covers an already cached result with no new request.
    await Promise.race([
      fetchedDashboards,
      page.getByRole("listbox", { name: "Dashboards", exact: true }).waitFor(),
    ]);
    const existing = page
      .getByRole("option")
      .filter({ has: page.getByText(name, { exact: true }) });
    if (await existing.count()) {
      // Reuse the completed artifact without appending a duplicate chart.
      await page.getByRole("button", { name: "Cancel", exact: true }).click();
      return;
    }
    const create = page.getByRole("button", {
      name: "Create new dashboard",
      exact: true,
    });
    if (await create.isVisible()) await create.click();
    await page.getByLabel("Dashboard name", { exact: true }).fill(name);
    await page
      .getByRole("button", { name: "Create dashboard & save", exact: true })
      .click();
    await page
      .getByText(`Created "${name}"`, { exact: true })
      .waitFor({ timeout: 20000 });
  });
  await step("dashboard-open-editor", async () => {
    await navigation(page, "Dashboards", `/${ctx.workspace}/dashboards`);
    await page.getByText(name, { exact: true }).click();
    await page.getByRole("button", { name: "View", exact: true }).waitFor();
  });
  const id = new URL(page.url()).pathname.split("/").at(-1);
  ctx.state.dashboard = { id, name };
  await ctx.recordResource?.({ kind: "dashboard", id, name });
  await checkpoint("dashboard-editor");
  await step("dashboard-preview", async () => {
    await page.getByRole("button", { name: "View", exact: true }).click();
    await page
      .getByText("Previewing this dashboard", { exact: true })
      .waitFor();
    await expect(page.locator(".recharts-bar-rectangle")).toHaveCount(6);
  });
  await checkpoint("dashboard-preview");
}

/** Flow names are stable CLI identifiers, not product feature availability claims. */
const productFlows = {
  import: importFlow,
  explorer,
  dashboards,
  cases: async (ctx) => (await import("./cases-map.mjs")).cases(ctx),
  map: async (ctx) => (await import("./cases-map.mjs")).map(ctx),
};

/** Failed runs retain the actual screen and redacted visible text for selector diagnosis. */
export const flows = Object.fromEntries(
  Object.entries(productFlows).map(([id, flow]) => [
    id,
    async (ctx) => {
      try {
        return await flow(ctx);
      } catch (error) {
        await ctx.checkpoint("failure", { text: true }).catch(() => {});
        throw error;
      }
    },
  ]),
);
