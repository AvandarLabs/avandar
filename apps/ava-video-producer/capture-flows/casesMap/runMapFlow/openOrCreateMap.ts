import { expect } from "@playwright/test";
import { UUID } from "../../captureFlows.constants";
import { closeChat } from "../../closeChat";
import { getRecordIdFromPageUrl } from "../../getRecordIdFromPageUrl";
import { isRestListResponse } from "../../isRestListResponse";
import {
  WAIT,
  makeWorkspaceUrlFromRoute,
  recordFlowResource,
} from "../casesMapHelpers";
import { waitForMapSave } from "./waitForMapSave";
import type { FlowContext } from "../../captureFlows.types";

/** Opens the map list once the app's list request has fully rendered. */
async function _openMapList(context: Readonly<FlowContext>): Promise<void> {
  const { page } = context;
  // Observe the app's list request so an initially empty render cannot
  // create a duplicate.
  const mapListResponse = page.waitForResponse(
    (response) => {
      return isRestListResponse({
        response,
        table: "maps",
      });
    },
    { timeout: WAIT },
  );
  const [response] = await Promise.all([
    mapListResponse,
    page.goto(
      makeWorkspaceUrlFromRoute({
        context,
        suffix: "map",
      }),
    ),
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
async function _openOrCreateNamedMap({
  context,
  name,
}: Readonly<{
  context: FlowContext;
  name: string;
}>): Promise<void> {
  const { page } = context;
  await _openMapList(context);
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
  context.state.map = {
    id: getRecordIdFromPageUrl({
      page,
      segment: "map",
    }),
    name,
    createdByRun: !isExistingMap,
  };
  await recordFlowResource({
    context,
    options: { kind: "map", item: context.state.map },
  });
}

/** Opens the capture map or creates and registers its named replacement. */
export async function openOrCreateMap(context: FlowContext): Promise<void> {
  const { page, state } = context;
  const name =
    state.map?.name ?? `Video - Harborfield response map - ${context.runLabel}`;
  if (state.map?.id) {
    await page.goto(
      makeWorkspaceUrlFromRoute({
        context,
        suffix: `map/${state.map.id}`,
      }),
    );
    await recordFlowResource({
      context,
      options: { kind: "map", item: state.map },
    });
  } else {
    await _openOrCreateNamedMap({
      context,
      name,
    });
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
  await waitForMapSave(page);
  await page.locator(".maplibregl-canvas").waitFor({ timeout: WAIT });
}
