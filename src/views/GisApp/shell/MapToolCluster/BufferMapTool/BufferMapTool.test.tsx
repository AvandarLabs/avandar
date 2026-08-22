import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";

import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Buffer tool: spatial and selection gating, default confirm payload.
 */
import { uuid } from "$/lib/uuid";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { fireEvent, render, screen } from "@/test-utils";
import { BufferMapTool } from "@/views/GisApp/shell/MapToolCluster/BufferMapTool/BufferMapTool";

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

function _createPolygonLayer(): MapLayer.T {
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

describe("BufferMapTool", () => {
  beforeEach(() => {
    spatialAvailability.value = "unavailable";
  });

  it("disables confirm when Spatial is unavailable", () => {
    render(
      <BufferMapTool
        selectedLayer={_createPolygonLayer()}
        onBufferConfirm={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("button", {
        name: "Buffer around a layer. This tool needs DuckDB Spatial, which is unavailable.",
      }),
    ).toHaveAttribute("aria-disabled", "true");
  });

  it("disables confirm without a selected data layer", () => {
    spatialAvailability.value = "available";
    render(
      <BufferMapTool selectedLayer={undefined} onBufferConfirm={vi.fn()} />,
    );

    expect(
      screen.getByRole("button", {
        name: "Buffer around a layer. Select a data layer to buffer.",
      }),
    ).toHaveAttribute("aria-disabled", "true");
  });

  it("disables confirm when the selected layer has no geometry", () => {
    spatialAvailability.value = "available";
    render(
      <BufferMapTool
        selectedLayer={MapLayer.makeEmpty("Cases")}
        onBufferConfirm={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("button", {
        name: "Buffer around a layer. Bind geometry on the selected layer to buffer it.",
      }),
    ).toHaveAttribute("aria-disabled", "true");
  });

  it("disables confirm when the selected layer is latitude and longitude columns", () => {
    spatialAvailability.value = "available";
    const latLngLayer: MapLayer.T = {
      ...MapLayer.makeEmpty("Cases"),
      geoBinding: {
        type: "latLngColumns",
        latitude: uuid<QueryColumn.Id>(),
        longitude: uuid<QueryColumn.Id>(),
      },
    };
    render(
      <BufferMapTool selectedLayer={latLngLayer} onBufferConfirm={vi.fn()} />,
    );

    expect(
      screen.getByRole("button", {
        name: "Buffer around a layer. Buffer needs a layer with compiled geometry, not latitude and longitude columns.",
      }),
    ).toHaveAttribute("aria-disabled", "true");
  });

  it("confirms a polygon layer at 1000 m without dissolve", async () => {
    spatialAvailability.value = "available";
    const onBufferConfirm = vi.fn();
    render(
      <BufferMapTool
        selectedLayer={_createPolygonLayer()}
        onBufferConfirm={onBufferConfirm}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Buffer around a layer" }),
    );
    const confirm = await screen.findByRole("button", { name: "Confirm" });
    fireEvent.click(confirm);

    expect(onBufferConfirm).toHaveBeenCalledWith({
      distanceMeters: 1000,
      dissolve: false,
    });
  });
});
