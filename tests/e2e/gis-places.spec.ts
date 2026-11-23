import { expect, test } from "./fixtures/e2e.fixture";
import { signInWithEmailPassword } from "./helpers/auth";
import { deleteDatasetAndShares } from "./helpers/datasetSharingCleanup";
import { deleteMapsByIds } from "./helpers/deleteMapsByIds";
import { seedAvaMap } from "./helpers/seedAvaMap";
import {
  createSupabaseAdminClient,
  getWorkspaceIdBySlug,
} from "./helpers/supabaseAdminClient";
import { LONG_WAIT, MEDIUM_WAIT } from "./helpers/timeouts";
import { E2E_ONLINE_TAG } from "./setup/ensureE2EViteFeatureFlags/ensureE2EViteFeatureFlags";
import type { AvaSupabaseDBClient } from "$/types/AvaSupabaseDbClient.types";
import type { E2EWorkerDb } from "./fixtures/e2e.fixture";
import type { Locator, Page } from "@playwright/test";

const MAP_NAME = "E2E GIS places";
const GEOCODE_CANDIDATE = {
  label: "350 West 46th Street, New York, NY 10036, United States of America",
  latitude: 40.7603,
  longitude: -73.9885,
  confidence: 0.95,
};

type PlacesSession = {
  supabaseAdminClient: AvaSupabaseDBClient;
  workspaceId: string;
  mapId: string;
  datasetName: string;
};

function _mapRegion(page: Page): Locator {
  return page.getByRole("region", { name: new RegExp(MAP_NAME) });
}

function _layerRow(page: Page, layerName: string): Locator {
  return page
    .getByRole("region", { name: "Layers" })
    .getByRole("listitem")
    .filter({ has: page.getByText(layerName, { exact: true }) });
}

/** Seeds an empty map and returns what cleanup needs, before any UI step. */
async function _seedMap(e2eWorkerDb: E2EWorkerDb): Promise<PlacesSession> {
  const supabaseAdminClient = createSupabaseAdminClient();
  const { primaryUser, workspaceSlug } = e2eWorkerDb;
  const workspaceId = await getWorkspaceIdBySlug({
    supabaseAdminClient,
    slug: workspaceSlug,
  });
  const mapId = await seedAvaMap({
    admin: supabaseAdminClient,
    workspaceId,
    ownerEmail: primaryUser.email,
    name: MAP_NAME,
  });
  return {
    supabaseAdminClient,
    workspaceId,
    mapId,
    datasetName: `E2E exposure sites ${Date.now()}`,
  };
}

/** Signs in and opens the seeded map. */
async function _openSeededMap(
  page: Page,
  e2eWorkerDb: E2EWorkerDb,
): Promise<void> {
  const { primaryUser, workspaceSlug } = e2eWorkerDb;
  await signInWithEmailPassword(page, {
    email: primaryUser.email,
    password: primaryUser.password,
    workspaceSlug,
  });
  await page.getByRole("link", { name: "Maps" }).click();
  await page.getByRole("link", { name: `Open the map ${MAP_NAME}` }).click();
  await expect(_mapRegion(page)).toBeVisible({ timeout: LONG_WAIT });
}

/** Creates a places dataset through the tool and waits for its layer. */
async function _createPlacesDataset(
  page: Page,
  datasetName: string,
): Promise<void> {
  await page.getByRole("button", { name: "Add a place" }).click();
  await page
    .getByRole("textbox", { name: "New places dataset name" })
    .fill(datasetName);
  await page.getByRole("button", { name: "Create places dataset" }).click();
  await page.getByRole("button", { name: "Back to layers" }).click();
  await expect(_layerRow(page, datasetName)).toBeVisible({
    timeout: LONG_WAIT,
  });
}

async function _clickCanvasFraction(
  page: Page,
  xFraction: number,
  yFraction: number,
): Promise<void> {
  const mapCanvas = _mapRegion(page).locator(".maplibregl-canvas");
  const canvasBox = await mapCanvas.boundingBox();
  if (!canvasBox) {
    throw new Error("MapLibre canvas was not visible for the place click.");
  }
  await mapCanvas.click({
    position: {
      x: canvasBox.width * xFraction,
      y: canvasBox.height * yFraction,
    },
    force: true,
  });
}

/** The source id of a layer's GeoJSON on the live MapLibre map. */
async function _readLayerSourceId(
  page: Page,
  layerName: string,
): Promise<string | undefined> {
  const describedBy = await _layerRow(page, layerName)
    .getByRole("button", { name: `Reorder layer ${layerName}` })
    .getAttribute("aria-describedby");
  const layerId = describedBy?.match(/^layer-(.+)-drag-instructions$/)?.[1];
  return layerId ? `ava-map-source-${layerId}` : undefined;
}

/**
 * Clicks the layer's only place where the map draws it. The camera can move
 * after a save (the map fits a new layer), so the place is located on screen
 * from its coordinates rather than assumed to sit at the canvas centre.
 */
async function _clickOnlyPlace(page: Page, layerName: string): Promise<void> {
  const sourceId = await _readLayerSourceId(page, layerName);
  const placePixel = await page.evaluate((id) => {
    const map = window.__avandarE2EMap;
    const source = id ? map?.getStyle()?.sources[id] : undefined;
    if (!map || source?.type !== "geojson" || typeof source.data !== "object") {
      return undefined;
    }
    const [feature] = (source.data as GeoJSON.FeatureCollection).features;
    if (feature?.geometry.type !== "Point") {
      return undefined;
    }
    const [longitude, latitude] = feature.geometry.coordinates;
    const pixel = map.project([longitude!, latitude!]);
    return { x: pixel.x, y: pixel.y };
  }, sourceId);
  if (!placePixel) {
    throw new Error(`Layer ${layerName} has no place to click.`);
  }
  await _mapRegion(page)
    .locator(".maplibregl-canvas")
    .click({ position: placePixel, force: true });
}

/** Names the place in the open form, saves it, and waits for the save. */
async function _savePlace(page: Page, placeName: string): Promise<void> {
  await page.getByRole("textbox", { name: /Place name/ }).fill(placeName);
  const saveButton = page.getByRole("button", { name: "Save place" });
  await saveButton.click();
  await expect(saveButton).toBeHidden({ timeout: LONG_WAIT });
  await expect(page.getByText("Place saved.").last()).toBeVisible({
    timeout: LONG_WAIT,
  });
}

/** Features in the layer's GeoJSON source, read off the live MapLibre map. */
async function _readLayerFeatureCount(
  page: Page,
  layerName: string,
): Promise<number | undefined> {
  const sourceId = await _readLayerSourceId(page, layerName);
  if (!sourceId) {
    return undefined;
  }
  return page.evaluate((id) => {
    const source = window.__avandarE2EMap?.getStyle()?.sources[id];
    if (
      !source ||
      source.type !== "geojson" ||
      typeof source.data !== "object"
    ) {
      return undefined;
    }
    return (source.data as GeoJSON.FeatureCollection).features.length;
  }, sourceId);
}

async function _expectFeatureCount(
  page: Page,
  layerName: string,
  featureCount: number,
): Promise<void> {
  await expect
    .poll(
      async () => {
        return await _readLayerFeatureCount(page, layerName);
      },
      { timeout: LONG_WAIT },
    )
    .toBe(featureCount);
}

/** The places dataset's stored SQL, read as an oracle. */
async function _readStoredSql(session: PlacesSession): Promise<string> {
  const { data: dataset } = await session.supabaseAdminClient
    .from("datasets")
    .select("id")
    .eq("workspace_id", session.workspaceId)
    .eq("name", session.datasetName)
    .single()
    .throwOnError();
  const { data: virtualDataset } = await session.supabaseAdminClient
    .from("datasets__virtual")
    .select("raw_sql")
    .eq("dataset_id", dataset.id)
    .single()
    .throwOnError();
  return virtualDataset.raw_sql;
}

/** Deletes the seeded map and every places dataset the UI created. */
async function _cleanUp(session: PlacesSession | undefined): Promise<void> {
  if (!session) {
    return;
  }
  const failures: unknown[] = [];
  try {
    await deleteMapsByIds({
      admin: session.supabaseAdminClient,
      mapIds: [session.mapId],
    });
  } catch (error) {
    failures.push(error);
  }
  try {
    const { data: datasets } = await session.supabaseAdminClient
      .from("datasets")
      .select("id")
      .eq("workspace_id", session.workspaceId)
      .eq("name", session.datasetName)
      .throwOnError();
    for (const dataset of datasets ?? []) {
      try {
        await deleteDatasetAndShares({
          supabaseAdminClient: session.supabaseAdminClient,
          datasetId: dataset.id,
        });
      } catch (error) {
        failures.push(error);
      }
    }
  } catch (error) {
    failures.push(error);
  }
  if (failures.length > 0) {
    throw new AggregateError(failures, "Places e2e cleanup failed.");
  }
}

test(
  "places added by a map click and by typed coordinates land in the dataset and on the map",
  { tag: E2E_ONLINE_TAG },
  async ({ page, e2eWorkerDb }) => {
    let session: PlacesSession | undefined;
    try {
      session = await _seedMap(e2eWorkerDb);
      await _openSeededMap(page, e2eWorkerDb);
      await _createPlacesDataset(page, session.datasetName);

      await page.getByRole("button", { name: "Click the map" }).click();
      await _clickCanvasFraction(page, 0.5, 0.5);
      await _savePlace(page, "Clicked restaurant");
      await _expectFeatureCount(page, session.datasetName, 1);

      await page.getByRole("button", { name: "Add a place" }).click();
      const coordinates = page.getByRole("textbox", {
        name: "Latitude and longitude",
      });
      await coordinates.fill("40.7603, -73.9885");
      await coordinates.press("Enter");
      await _savePlace(page, "O'Brien's Café");
      await _expectFeatureCount(page, session.datasetName, 2);

      const storedSql = await _readStoredSql(session);
      expect(storedSql).toContain("'Clicked restaurant'");
      expect(storedSql).toContain("'O''Brien''s Café'");
    } finally {
      await _cleanUp(session);
    }
  },
);

test(
  "a place from address search keeps the address and credits OpenStreetMap",
  { tag: E2E_ONLINE_TAG },
  async ({ page, e2eWorkerDb }) => {
    let session: PlacesSession | undefined;
    try {
      // CI holds no Geoapify key, so the search never leaves the browser.
      await page.route("**/functions/v1/geocode/search", async (route) => {
        if (route.request().method() !== "POST") {
          await route.fallback();
          return;
        }
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ candidates: [GEOCODE_CANDIDATE] }),
        });
      });
      session = await _seedMap(e2eWorkerDb);
      await _openSeededMap(page, e2eWorkerDb);
      await _createPlacesDataset(page, session.datasetName);

      await page
        .getByRole("textbox", { name: "Search an address" })
        .fill("350 W 46th St");
      await expect(
        page.getByRole("link", { name: "© OpenStreetMap contributors" }),
      ).toBeVisible({ timeout: MEDIUM_WAIT });
      await page.getByRole("button", { name: GEOCODE_CANDIDATE.label }).click();
      await expect(page.getByRole("textbox", { name: "Address" })).toHaveValue(
        GEOCODE_CANDIDATE.label,
      );
      await _savePlace(page, "Restaurant, W 46th St");
      await _expectFeatureCount(page, session.datasetName, 1);

      expect(await _readStoredSql(session)).toContain(
        `'${GEOCODE_CANDIDATE.label}'`,
      );
    } finally {
      await _cleanUp(session);
    }
  },
);

test(
  "a place clicked on the map can be renamed and then deleted",
  { tag: E2E_ONLINE_TAG },
  async ({ page, e2eWorkerDb }) => {
    let session: PlacesSession | undefined;
    try {
      session = await _seedMap(e2eWorkerDb);
      await _openSeededMap(page, e2eWorkerDb);
      const openSession = session;
      await _createPlacesDataset(page, session.datasetName);
      await page.getByRole("button", { name: "Click the map" }).click();
      await _clickCanvasFraction(page, 0.5, 0.5);
      await _savePlace(page, "Clinic");
      await _expectFeatureCount(page, session.datasetName, 1);

      await _clickOnlyPlace(page, session.datasetName);
      await page.getByRole("button", { name: "Edit place" }).click();
      const nameField = page.getByRole("textbox", { name: /Place name/ });
      await expect(nameField).toHaveValue("Clinic");
      await _savePlace(page, "Clinic, side door");
      await expect
        .poll(
          async () => {
            return await _readStoredSql(openSession);
          },
          { timeout: LONG_WAIT },
        )
        .toContain("'Clinic, side door'");

      await _clickOnlyPlace(page, session.datasetName);
      await page.getByRole("button", { name: "Delete place" }).click();
      await page
        .getByRole("dialog")
        .getByRole("button", { name: "Delete" })
        .click();
      // An empty dataset draws no source at all, so the layer row says so.
      await expect(
        _layerRow(page, session.datasetName).getByText(/no rows/i),
      ).toBeVisible({ timeout: LONG_WAIT });
      expect(await _readStoredSql(session)).not.toContain(
        "'Clinic, side door'",
      );
    } finally {
      await _cleanUp(session);
    }
  },
);
