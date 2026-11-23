import { promiseMapSequential } from "@avandar/utils";
import { expect, type Locator, type Page } from "@playwright/test";
import { ensureFixtureDataset } from "../../ensureFixtureDataset";
import {
  WAIT,
  makeRegexSourceFromText,
  makeWorkspaceUrlFromRoute,
} from "../casesMapHelpers";
import { openOrCreateMap } from "./openOrCreateMap";
import { waitForMapSave } from "./waitForMapSave";
import type { FlowContext, FlowRecord } from "../../captureFlows.types";

async function _configureCaseLocations({
  context,
  source,
}: Readonly<{ context: FlowContext; source: FlowRecord }>): Promise<void> {
  await _configurePoints({
    context,
    options: {
      source: source,
      expectedRowCount: 240,
      color: "#228be6",
      radius: 4,
    },
  });
  await _zoomToLayer({
    page: context.page,
    name: source.name,
  });
}
async function _getMapSources(
  context: FlowContext,
): Promise<{ cases: FlowRecord; facilities: FlowRecord }> {
  return {
    cases: await ensureFixtureDataset({
      context,
      key: "cases",
    }),
    facilities: await ensureFixtureDataset({
      context,
      key: "facilities",
    }),
  };
}
async function _reloadMapSources({
  context,
  sources,
}: Readonly<{
  context: FlowContext;
  sources: Readonly<{ cases: FlowRecord; facilities: FlowRecord }>;
}>): Promise<void> {
  await waitForMapSave(context.page);
  await context.page.reload();
  await expect(
    context.page.getByRole("textbox", { name: "Map name", exact: true }),
  ).toHaveValue(context.state.map?.name ?? "", { timeout: WAIT });
  // Each check reads the one recording page, so they run in order.
  await promiseMapSequential(Object.values(sources), async (source) => {
    await _layerRow({
      page: context.page,
      name: source.name,
    }).waitFor({ timeout: WAIT });
  });
  await context.page.locator(".maplibregl-canvas").waitFor();
}
/** The point layer settings the map flow applies to one data source. */
type PointLayerSettings = {
  source: FlowRecord;
  expectedRowCount: number;
  color: string;
  radius: number;
};
function _layerRow({
  page,
  name,
}: Readonly<{
  page: Page;
  name: string;
}>): Locator {
  return page
    .getByRole("region", { name: "Layers", exact: true })
    .getByRole("listitem")
    .filter({
      has: page.getByText(name, { exact: true }),
    });
}

async function _openLayer({
  context,
  source,
}: Readonly<{
  context: Readonly<FlowContext>;
  source: Readonly<FlowRecord>;
}>): Promise<Locator> {
  const { page } = context;
  const row = _layerRow({
    page,
    name: source.name,
  });
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
async function _styleLayer({
  context,
  options,
}: Readonly<{
  context: Readonly<FlowContext>;
  options: Readonly<{
    inspector: Locator;
    color: string;
    radius: number;
  }>;
}>): Promise<void> {
  const { inspector } = options;
  await inspector.getByLabel("Color", { exact: true }).fill(options.color);
  await inspector.getByLabel("Color", { exact: true }).press("Tab");
  await inspector
    .getByLabel("Radius", { exact: true })
    .fill(String(options.radius));
  await inspector.getByLabel("Radius", { exact: true }).press("Tab");
  // Tab moves into the Outline ColorInput, which opens its native color picker.
  await context.page.keyboard.press("Escape");
  await context.page
    .getByRole("textbox", { name: "Map name", exact: true })
    .click();
  await expect(context.page.locator(".mantine-ColorPicker-root")).toBeHidden();
  await waitForMapSave(context.page);
}
async function _configurePoints({
  context,
  options,
}: Readonly<{
  context: Readonly<FlowContext>;
  options: Readonly<PointLayerSettings>;
}>): Promise<void> {
  const { source, expectedRowCount, color, radius } = options;
  const inspector = await _openLayer({
    context,
    source,
  });
  await expect(
    inspector.getByRole("combobox", { name: "Latitude", exact: true }),
  ).toHaveValue("latitude", { timeout: WAIT });
  await expect(
    inspector.getByRole("combobox", { name: "Longitude", exact: true }),
  ).toHaveValue("longitude", { timeout: WAIT });
  const loadError = context.page.getByText(`Could not load ${source.name}`, {
    exact: true,
  });
  const mapped = inspector.getByText(
    `${expectedRowCount} of ${expectedRowCount} rows mapped`,
    { exact: true },
  );
  await expect(mapped.or(loadError).first()).toBeVisible({ timeout: WAIT });
  if (await loadError.count()) {
    await context.page
      .getByRole("button", { name: "Show details", exact: true })
      .click();
    await context.checkpoint("map-layer-query-error", { text: true });
    throw new Error(
      `The product could not load the point layer ${source.name}; see the visible query-error checkpoint.`,
    );
  }
  await mapped.waitFor({ timeout: WAIT });
  await _styleLayer({
    context,
    options: { inspector, color, radius },
  });
}
async function _openLayerActions({
  page,
  name,
}: Readonly<{
  page: Page;
  name: string;
}>): Promise<void> {
  await page
    .getByRole("button", {
      name: `More actions for the layer ${name}`,
      exact: true,
    })
    .click();
}
async function _zoomToLayer({
  page,
  name,
}: Readonly<{
  page: Page;
  name: string;
}>): Promise<void> {
  await _openLayerActions({
    page,
    name,
  });
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
  context: Readonly<FlowContext>,
): Promise<void> {
  const name = "Video - Harborfield districts";
  if (
    !(await _layerRow({
      page: context.page,
      name,
    }).count())
  ) {
    return;
  }
  await _openLayerActions({
    page: context.page,
    name,
  });
  await context.page
    .getByRole("menuitem", { name: "Delete", exact: true })
    .click();
  await expect(
    _layerRow({
      page: context.page,
      name,
    }),
  ).toHaveCount(0);
  await waitForMapSave(context.page);
}
/**
 * Reloads the map and checks its name, layers, and mapped row counts
 * persisted.
 */
async function _verifyMapPersistence({
  context,
  sources,
}: Readonly<{
  context: Readonly<FlowContext>;
  sources: Readonly<{
    cases: FlowRecord;
    facilities: FlowRecord;
  }>;
}>): Promise<void> {
  await _reloadMapSources({ context, sources });
  // Each layer is opened on the one recording page, so they run in order.
  await promiseMapSequential(
    [
      ["cases", 240],
      ["facilities", 12],
    ] as const,
    async ([key, expectedRowCount]) => {
      const inspector = await _openLayer({
        context,
        source: sources[key],
      });
      await inspector
        .getByText(`${expectedRowCount} of ${expectedRowCount} rows mapped`, {
          exact: true,
        })
        .waitFor({ timeout: WAIT });
    },
  );
  await _zoomToLayer({
    page: context.page,
    name: sources.cases.name,
  });
  await waitForMapSave(context.page);
}
/**
 * The `map` capture flow: creates or reuses a map with the case and facility
 * point layers and checks they persist. WKT geometry currently fails in
 * product QETL, so the district layer is not part of it.
 *
 * `AvandarCaptureFlows` loads it on demand as the `map` flow that
 * `pnpm capture` runs.
 */
export async function runMapFlow(context: FlowContext): Promise<void> {
  makeWorkspaceUrlFromRoute({
    context,
    suffix: "map",
  });
  const sources = await _getMapSources(context);
  await context.step("map-create", async () => {
    await openOrCreateMap(context);
  });
  await context.step("map-remove-failed-fixture-layer", () => {
    return _removeFailedFixtureLayer(context);
  });
  await context.step("map-case-locations", async () => {
    await _configureCaseLocations({ context, source: sources.cases });
  });
  await context.checkpoint("map-cases");
  await context.step("map-facility-locations", async () => {
    await _configurePoints({
      context,
      options: {
        source: sources.facilities,
        expectedRowCount: 12,
        color: "#f08c00",
        radius: 8,
      },
    });
  });
  await context.checkpoint("map-facilities");
  await context.step("map-verify-persistence", () => {
    return _verifyMapPersistence({
      context,
      sources,
    });
  });
  await context.checkpoint("map-saved");
}
