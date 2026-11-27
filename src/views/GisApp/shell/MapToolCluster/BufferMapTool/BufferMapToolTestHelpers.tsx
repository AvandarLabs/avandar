import { Model } from "@avandar/models";
import { vi } from "vitest";
import { uuid } from "$/lib/uuid";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import { fireEvent, screen } from "@/test-utils";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { Workspace } from "$/models/Workspace/Workspace";

/** Hoisted DuckDB spatial availability controlled by the map-tool tests. */
const spatialAvailability = vi.hoisted(() => {
  return {
    value: "unavailable" as "loading" | "available" | "unavailable",
  };
});

vi.mock("@/clients/DuckDbClient/DuckDbClient", () => {
  return {
    DuckDbClient: {
      getSpatialAvailability: () => {
        return spatialAvailability.value;
      },
      subscribeSpatialAvailability: () => {
        return () => {
          return undefined;
        };
      },
    },
  };
});

/** Creates a polygon layer used to exercise the Buffer tool. */
export function createPolygonLayer(): MapLayer.T {
  return {
    ...MapLayer.createArea("Cases"),
    geoBinding: {
      type: "geometryColumn",
      column: uuid<QueryColumn.Id>(),
      encoding: "wkt",
      family: "polygon",
      simplification: { tolerancePixels: 0.75 },
      sourceCrs: undefined,
    },
  };
}

/** Creates a typed query result column for map-layer fixtures. */
export function makeQueryColumn(name: string): QueryColumn.T {
  return QueryColumn.makeFromDatasetColumn(
    Model.make("DatasetColumn", {
      createdAt: "2026-11-09T00:00:00.000Z",
      updatedAt: "2026-11-09T00:00:00.000Z",
      id: uuid<DatasetColumn.Id>(),
      datasetId: uuid<Dataset.Id>(),
      workspaceId: uuid<Workspace.Id>(),
      name,
      originalName: name,
      originalDataType: "VARCHAR",
      dataType: "varchar",
      detectedDataType: "VARCHAR",
      description: undefined,
      columnIdx: 0,
    }),
  );
}

/**
 * A latitude and longitude layer as a new layer has it: only the bound
 * coordinate columns are queried, and the source's other columns are only
 * in its hydrated source columns.
 */
export function createLatLngLayer(name: string): MapLayer.T {
  const siteName = makeQueryColumn("site_name");
  const latitude = makeQueryColumn("latitude");
  const longitude = makeQueryColumn("longitude");
  const layer = MapLayer.makeEmpty(name);
  return {
    ...layer,
    source: {
      ...layer.source,
      queryColumns: [latitude, longitude],
      sourceColumns: [
        siteName,
        { ...latitude, id: uuid<QueryColumn.Id>() },
        { ...longitude, id: uuid<QueryColumn.Id>() },
      ],
    },
    geoBinding: {
      type: "latLngColumns",
      latitude: latitude.id,
      longitude: longitude.id,
    },
  };
}

/** Creates the buffer operation metadata used by map-layer tests. */
export function makeBufferOf(source: MapLayer.T): MapLayer.T {
  return {
    ...MapLayer.createArea(`Buffer of ${source.name}`),
    geoBinding: {
      type: "bufferOfLayer",
      layerId: source.id,
      distanceMeters: 805,
      distanceUnit: "mi",
      labelColumn: undefined,
      dissolve: false,
    },
  };
}

/** Opens the Buffer form through its visible toolbar control. */
export async function openBufferForm(): Promise<void> {
  fireEvent.click(
    screen.getByRole("button", { name: "Buffer around a layer" }),
  );
  await screen.findByRole("button", { name: "Confirm" });
}

/**
 * Picks a Select option the way a pointer does: a mouse down before the
 * click, which is what a popover listens to when it closes on outside
 * presses.
 */
export function pressMantineSelectOption(
  comboboxLabel: string,
  optionLabel: string,
): void {
  fireEvent.click(screen.getByRole("combobox", { name: comboboxLabel }));
  const option = screen.getByRole("option", {
    name: optionLabel,
    hidden: true,
  });
  fireEvent.mouseDown(option);
  fireEvent.click(option);
}

export { spatialAvailability };
