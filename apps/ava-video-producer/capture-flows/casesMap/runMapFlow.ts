import { promiseMapSequential } from "@avandar/utils";
import { expect, type Locator, type Page } from "@playwright/test";
import { closeChat } from "../closeChat";
import { ensureFixtureDataset } from "../ensureFixtureDataset";
import { getRecordIdFromPageUrl } from "../getRecordIdFromPageUrl";
import { isRestListResponse } from "../isRestListResponse";
import { UUID } from "../UUID";
import {
  WAIT,
  makeRegexSourceFromText,
  makeWorkspaceUrlFromRoute,
  recordFlowResource,
} from "./casesMapHelpers";
import type { FlowContext, FlowRecord } from "../captureFlows.types";

/** The point layer settings the map flow applies to one data source. */
type PointLayerSettings = {
  source: FlowRecord;
  expectedRowCount: number;
  color: string;
  radius: number;
};

function _layerRow(page: Page, name: string): Locator {
  return page
    .getByRole("region", { name: "Layers", exact: true })
    .getByRole("listitem")
    .filter({
      has: page.getByText(name, { exact: true }),
    });
}

async function _mapSaved(page: Page): Promise<void> {
  await page
    .getByRole("status", { name: "All changes saved", exact: true })
    .waitFor({ timeout: WAIT });
}

/** Opens the map list once the app's list request has fully rendered. */
async function _openMapList(ctx: Readonly<FlowContext>): Promise<void> {
  const { page } = ctx;
  // Observe the app's list request so an initially empty render cannot
  // create a duplicate.
  const mapListResponse = page.waitForResponse(
    (response) => isRestListResponse(response, "maps"),
    { timeout: WAIT },
  );
  const [response] = await Promise.all([
    mapListResponse,
    page.goto(makeWorkspaceUrlFromRoute(ctx, "map")),
  ]);
  const rows = await response.json();
  if (!Array.isArray(rows)) {
    throw new Error("The map list did not return a collection.");
  }
  await expect(page.getByRole("link", { name: /^Open the map / })).toHaveCount(
    rows.length,
    { timeout: WAIT },
  );
  await page.getByRole("button", { name: "New map", exact: true }).waitFor();
}

/** Opens the map with the capture name, or creates one, and records it. */
async function _openOrCreateNamedMap(
  ctx: FlowContext,
  name: string,
): Promise<void> {
  const { page } = ctx;
  await _openMapList(ctx);
  const existing = page.getByRole("link", {
    name: `Open the map ${name}`,
    exact: true,
  });
  if ((await existing.count()) > 1) {
    throw new Error(`More than one map has the capture name: ${name}`);
  }
  const isExistingMap = (await existing.count()) === 1;
  if (isExistingMap) {
    await existing.click();
  } else {
    await page.getByRole("button", { name: "New map", exact: true }).click();
  }
  await page.waitForURL(new RegExp(`/map/${UUID}(?:\\?|$)`), {
    timeout: WAIT,
  });
  ctx.state.map = {
    id: getRecordIdFromPageUrl(page, "map"),
    name,
    createdByRun: !isExistingMap,
  };
  await recordFlowResource(ctx, { kind: "map", item: ctx.state.map });
}

async function _openOrCreateMap(ctx: FlowContext): Promise<void> {
  const { page, state } = ctx;
  const name =
    state.map?.name ?? `Video - Harborfield response map - ${ctx.runLabel}`;
  if (state.map?.id) {
    await page.goto(makeWorkspaceUrlFromRoute(ctx, `map/${state.map.id}`));
    await recordFlowResource(ctx, { kind: "map", item: state.map });
  } else {
    await _openOrCreateNamedMap(ctx, name);
  }
  await closeChat(page);
  const nameInput = page.getByRole("textbox", {
    name: "Map name",
    exact: true,
  });
  await nameInput.waitFor({ timeout: WAIT });
  if ((await nameInput.inputValue()) !== name) {
    await nameInput.fill(name);
    await nameInput.press("Tab");
  }
  await _mapSaved(page);
  await page.locator(".maplibregl-canvas").waitFor({ timeout: WAIT });
}

async function _openLayer(
  ctx: Readonly<FlowContext>,
  source: Readonly<FlowRecord>,
): Promise<Locator> {
  const { page } = ctx;
  const row = _layerRow(page, source.name);
  if ((await row.count()) > 1) {
    throw new Error(`Duplicate capture layer: ${source.name}`);
  }
  if (!(await row.count())) {
    await page
      .getByRole("region", { name: "Layers", exact: true })
      .getByRole("button", { name: "Add layer", exact: true })
      .click();
    await page.getByPlaceholder("Search data sources", { exact: true }).click();
    await page.getByRole("option", { name: source.name, exact: true }).click();
  }
  await row.waitFor({ timeout: WAIT });
  await row
    .getByRole("button", {
      name: new RegExp(`^${makeRegexSourceFromText(source.name)}(?:\\s|$)`),
    })
    .click();
  const inspector = page.getByRole("region", { name: "Layer", exact: true });
  await inspector.waitFor();
  return inspector;
}

/** Sets a point layer's colour and radius, then waits for the map to save. */
async function _styleLayer(
  ctx: Readonly<FlowContext>,
  options: Readonly<{ inspector: Locator; color: string; radius: number }>,
): Promise<void> {
  const { inspector } = options;
  await inspector.getByLabel("Color", { exact: true }).fill(options.color);
  await inspector.getByLabel("Color", { exact: true }).press("Tab");
  await inspector
    .getByLabel("Radius", { exact: true })
    .fill(String(options.radius));
  await inspector.getByLabel("Radius", { exact: true }).press("Tab");
  // Tab moves into the Outline ColorInput, which opens its native color picker.
  await ctx.page.keyboard.press("Escape");
  await ctx.page
    .getByRole("textbox", { name: "Map name", exact: true })
    .click();
  await expect(ctx.page.locator(".mantine-ColorPicker-root")).toBeHidden();
  await _mapSaved(ctx.page);
}

async function _configurePoints(
  ctx: Readonly<FlowContext>,
  options: Readonly<PointLayerSettings>,
): Promise<void> {
  const { source, expectedRowCount, color, radius } = options;
  const inspector = await _openLayer(ctx, source);
  await expect(
    inspector.getByRole("combobox", { name: "Latitude", exact: true }),
  ).toHaveValue("latitude", { timeout: WAIT });
  await expect(
    inspector.getByRole("combobox", { name: "Longitude", exact: true }),
  ).toHaveValue("longitude", { timeout: WAIT });
  const loadError = ctx.page.getByText(`Could not load ${source.name}`, {
    exact: true,
  });
  const mapped = inspector.getByText(
    `${expectedRowCount} of ${expectedRowCount} rows mapped`,
    { exact: true },
  );
  await expect(mapped.or(loadError).first()).toBeVisible({ timeout: WAIT });
  if (await loadError.count()) {
    await ctx.page
      .getByRole("button", { name: "Show details", exact: true })
      .click();
    await ctx.checkpoint("map-layer-query-error", { text: true });
    throw new Error(
      `The product could not load the point layer ${source.name}; see the visible query-error checkpoint.`,
    );
  }
  await mapped.waitFor({ timeout: WAIT });
  await _styleLayer(ctx, { inspector, color, radius });
}

async function _openLayerActions(page: Page, name: string): Promise<void> {
  await page
    .getByRole("button", {
      name: `More actions for the layer ${name}`,
      exact: true,
    })
    .click();
}

async function _zoomToLayer(page: Page, name: string): Promise<void> {
  await _openLayerActions(page, name);
  await page
    .getByRole("menuitem", { name: "Zoom to layer", exact: true })
    .click();
}

/**
 * Removes the fixture district layer (`Video - Harborfield districts`) if an
 * earlier run added it, because its WKT geometry fails to load in product
 * QETL. Unrelated layers and imported datasets stay intact.
 */
async function _removeFailedFixtureLayer(
  ctx: Readonly<FlowContext>,
): Promise<void> {
  const name = "Video - Harborfield districts";
  if (!(await _layerRow(ctx.page, name).count())) {
    return;
  }
  await _openLayerActions(ctx.page, name);
  await ctx.page.getByRole("menuitem", { name: "Delete", exact: true }).click();
  await expect(_layerRow(ctx.page, name)).toHaveCount(0);
  await _mapSaved(ctx.page);
}

/**
 * Reloads the map and checks its name, layers, and mapped row counts
 * persisted.
 */
async function _verifyMapPersistence(
  ctx: Readonly<FlowContext>,
  sources: Readonly<{ cases: FlowRecord; facilities: FlowRecord }>,
): Promise<void> {
  await _mapSaved(ctx.page);
  await ctx.page.reload();
  await expect(
    ctx.page.getByRole("textbox", { name: "Map name", exact: true }),
  ).toHaveValue(ctx.state.map?.name ?? "", { timeout: WAIT });
  // Each check reads the one recording page, so they run in order.
  await promiseMapSequential(Object.values(sources), async (source) => {
    await _layerRow(ctx.page, source.name).waitFor({ timeout: WAIT });
  });
  await ctx.page.locator(".maplibregl-canvas").waitFor();
  // Each layer is opened on the one recording page, so they run in order.
  await promiseMapSequential(
    [
      ["cases", 240],
      ["facilities", 12],
    ] as const,
    async ([key, expectedRowCount]) => {
      const inspector = await _openLayer(ctx, sources[key]);
      await inspector
        .getByText(`${expectedRowCount} of ${expectedRowCount} rows mapped`, {
          exact: true,
        })
        .waitFor({ timeout: WAIT });
    },
  );
  await _zoomToLayer(ctx.page, sources.cases.name);
  await _mapSaved(ctx.page);
}

/**
 * The `map` capture flow: creates or reuses a map with the case and facility
 * point layers and checks they persist. WKT geometry currently fails in
 * product QETL, so the district layer is not part of it.
 *
 * `AvandarCaptureFlows` loads it on demand as the `map` flow that
 * `pnpm capture` runs.
 */
export async function runMapFlow(ctx: FlowContext): Promise<void> {
  makeWorkspaceUrlFromRoute(ctx, "map");
  const sources = {
    cases: await ensureFixtureDataset(ctx, "cases"),
    facilities: await ensureFixtureDataset(ctx, "facilities"),
  };
  await ctx.step("map-create", async () => {
    await _openOrCreateMap(ctx);
  });
  await ctx.step("map-remove-failed-fixture-layer", () =>
    _removeFailedFixtureLayer(ctx),
  );
  await ctx.step("map-case-locations", async () => {
    await _configurePoints(ctx, {
      source: sources.cases,
      expectedRowCount: 240,
      color: "#228be6",
      radius: 4,
    });
    await _zoomToLayer(ctx.page, sources.cases.name);
  });
  await ctx.checkpoint("map-cases");
  await ctx.step("map-facility-locations", async () => {
    await _configurePoints(ctx, {
      source: sources.facilities,
      expectedRowCount: 12,
      color: "#f08c00",
      radius: 8,
    });
  });
  await ctx.checkpoint("map-facilities");
  await ctx.step("map-verify-persistence", () =>
    _verifyMapPersistence(ctx, sources),
  );
  await ctx.checkpoint("map-saved");
}
