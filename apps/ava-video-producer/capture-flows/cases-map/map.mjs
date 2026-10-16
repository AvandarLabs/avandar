import { expect } from "@playwright/test";
import {
  UUID,
  WAIT,
  closeChat,
  dataset,
  escapeRegex,
  idFromRoute,
  localRoute,
  resource,
} from "./shared.mjs";

function layerRow(page, name) {
  return page
    .getByRole("region", { name: "Layers", exact: true })
    .getByRole("listitem")
    .filter({
      has: page.getByText(name, { exact: true }),
    });
}

async function mapSaved(page) {
  await page
    .getByRole("status", { name: "All changes saved", exact: true })
    .waitFor({ timeout: WAIT });
}

async function openOrCreateMap(ctx) {
  const { page, state } = ctx;
  const name =
    state.map?.name ?? `Video - Harborfield response map - ${ctx.runLabel}`;
  if (state.map?.id) {
    await page.goto(localRoute(ctx, `map/${state.map.id}`));
    await resource(ctx, "map", state.map);
  } else {
    // Observe the app's list request so an initially empty render cannot create a duplicate.
    const loaded = page.waitForResponse(
      (response) => {
        return (
          new URL(response.url()).pathname.endsWith("/rest/v1/maps") &&
          response.request().method() === "GET" &&
          response.ok()
        );
      },
      { timeout: WAIT },
    );
    const [response] = await Promise.all([
      loaded,
      page.goto(localRoute(ctx, "map")),
    ]);
    const rows = await response.json();
    if (!Array.isArray(rows))
      throw new Error("The map list did not return a collection.");
    await expect(
      page.getByRole("link", { name: /^Open the map / }),
    ).toHaveCount(rows.length, { timeout: WAIT });
    await page.getByRole("button", { name: "New map", exact: true }).waitFor();
    const existing = page.getByRole("link", {
      name: `Open the map ${name}`,
      exact: true,
    });
    if ((await existing.count()) > 1)
      throw new Error(`More than one map has the capture name: ${name}`);
    const reuse = (await existing.count()) === 1;
    if (reuse) await existing.click();
    else
      await page.getByRole("button", { name: "New map", exact: true }).click();
    await page.waitForURL(new RegExp(`/map/${UUID}(?:\\?|$)`), {
      timeout: WAIT,
    });
    state.map = { id: idFromRoute(page, "map"), name, createdByRun: !reuse };
    await resource(ctx, "map", state.map);
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
  await mapSaved(page);
  await page.locator(".maplibregl-canvas").waitFor({ timeout: WAIT });
}

async function openLayer(ctx, source) {
  const { page } = ctx;
  const row = layerRow(page, source.name);
  if ((await row.count()) > 1)
    throw new Error(`Duplicate capture layer: ${source.name}`);
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
      name: new RegExp(`^${escapeRegex(source.name)}(?:\\s|$)`),
    })
    .click();
  const inspector = page.getByRole("region", { name: "Layer", exact: true });
  await inspector.waitFor();
  return inspector;
}

async function configurePoints(ctx, source, expectedRowCount, color, radius) {
  const inspector = await openLayer(ctx, source);
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
  await inspector.getByLabel("Color", { exact: true }).fill(color);
  await inspector.getByLabel("Color", { exact: true }).press("Tab");
  await inspector.getByLabel("Radius", { exact: true }).fill(String(radius));
  await inspector.getByLabel("Radius", { exact: true }).press("Tab");
  // Tab moves into the Outline ColorInput, which opens its native color picker.
  await ctx.page.keyboard.press("Escape");
  await ctx.page
    .getByRole("textbox", { name: "Map name", exact: true })
    .click();
  await expect(ctx.page.locator(".mantine-ColorPicker-root")).toBeHidden();
  await mapSaved(ctx.page);
}

async function zoomToLayer(page, name) {
  await page
    .getByRole("button", {
      name: `More actions for the layer ${name}`,
      exact: true,
    })
    .click();
  await page
    .getByRole("menuitem", { name: "Zoom to layer", exact: true })
    .click();
}

/** Captures the verified point-layer story. WKT geometry currently fails in product QETL. */
export async function map(ctx) {
  localRoute(ctx, "map");
  ctx.state ??= {};
  const sources = {};
  for (const key of ["cases", "facilities"])
    sources[key] = await dataset(ctx, key);
  await ctx.step("map-create", async () => {
    await openOrCreateMap(ctx);
  });
  await ctx.step("map-remove-failed-fixture-layer", async () => {
    // Only the exact task-owned district layer is removed. Its failure is recorded
    // in the rehearsal report; unrelated layers and imported datasets remain intact.
    const name = "Video - Harborfield districts";
    if (await layerRow(ctx.page, name).count()) {
      await ctx.page
        .getByRole("button", {
          name: `More actions for the layer ${name}`,
          exact: true,
        })
        .click();
      await ctx.page
        .getByRole("menuitem", { name: "Delete", exact: true })
        .click();
      await expect(layerRow(ctx.page, name)).toHaveCount(0);
      await mapSaved(ctx.page);
    }
  });
  await ctx.step("map-case-locations", async () => {
    await configurePoints(ctx, sources.cases, 240, "#228be6", 4);
    await zoomToLayer(ctx.page, sources.cases.name);
  });
  await ctx.checkpoint("map-cases");
  await ctx.step("map-facility-locations", async () => {
    await configurePoints(ctx, sources.facilities, 12, "#f08c00", 8);
  });
  await ctx.checkpoint("map-facilities");
  await ctx.step("map-verify-persistence", async () => {
    await mapSaved(ctx.page);
    await ctx.page.reload();
    await expect(
      ctx.page.getByRole("textbox", { name: "Map name", exact: true }),
    ).toHaveValue(ctx.state.map.name, { timeout: WAIT });
    for (const source of Object.values(sources))
      await layerRow(ctx.page, source.name).waitFor({ timeout: WAIT });
    await ctx.page.locator(".maplibregl-canvas").waitFor();
    for (const [key, expectedRowCount] of [
      ["cases", 240],
      ["facilities", 12],
    ]) {
      const inspector = await openLayer(ctx, sources[key]);
      await inspector
        .getByText(`${expectedRowCount} of ${expectedRowCount} rows mapped`, {
          exact: true,
        })
        .waitFor({ timeout: WAIT });
    }
    await zoomToLayer(ctx.page, sources.cases.name);
    await mapSaved(ctx.page);
  });
  await ctx.checkpoint("map-saved");
}
