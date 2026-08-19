/**
 * Tool cluster: Area gating, pressed state, Escape, and AOI commit.
 */
import { uuid } from "$/lib/uuid";
import { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@/test-utils";
import { createFakeMap } from "@/views/GisApp/shell/MapToolCluster/createFakeMap";
import { MapToolCluster } from "@/views/GisApp/shell/MapToolCluster/MapToolCluster";
import {
  AreaToolHarness,
  MeasureToolHarness,
} from "@/views/GisApp/shell/MapToolCluster/mapToolClusterHarness";
import type { MapToolMode } from "@/views/GisApp/tools/MapToolMode.types";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import type { ReactNode } from "react";

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

describe("MapToolCluster", () => {
  beforeEach(() => {
    spatialAvailability.value = "unavailable";
  });

  it("renders toolbar tools in spec order", () => {
    render(
      <MapToolCluster
        mapToolMode={{ type: "pan" }}
        onMapToolModeChange={vi.fn()}
      />,
    );

    const toolbar = screen.getByRole("toolbar", { name: "Map tools" });
    const labels = within(toolbar)
      .getAllByRole("button")
      .map((button) => {
        return button.getAttribute("aria-label");
      });

    expect(labels).toEqual([
      "Pan and select",
      "Draw an area to filter by. This tool needs DuckDB Spatial, which is unavailable.",
      "Measure distance and area",
      "Buffer around a layer. This tool needs DuckDB Spatial, which is unavailable.",
      "Isochrone from a point. This tool arrives in a later release.",
      "Annotate the map",
    ]);
    expect(
      within(toolbar).getByRole("textbox", {
        name: "Go to a coordinate or P-code",
      }),
    ).not.toBeDisabled();
  });

  it("keeps pan active and explains unavailable tools accessibly", () => {
    render(
      <MapToolCluster
        mapToolMode={{ type: "pan" }}
        onMapToolModeChange={vi.fn()}
      />,
    );

    expect(screen.getByRole("toolbar", { name: "Map tools" })).toHaveAttribute(
      "id",
      "gis-map-tools",
    );
    expect(
      screen.getByRole("button", { name: "Pan and select" }),
    ).toHaveAttribute("aria-pressed", "true");

    const unavailableTool = screen.getByRole("button", {
      name: "Isochrone from a point. This tool arrives in a later release.",
    });
    expect(unavailableTool).toHaveAttribute("aria-disabled", "true");
    expect(
      screen.getByRole("button", { name: "Annotate the map" }),
    ).not.toHaveAttribute("aria-disabled", "true");
  });

  it("keeps pan pressed and disables isochrone as a later release", () => {
    render(
      <MapToolCluster
        mapToolMode={{ type: "pan" }}
        onMapToolModeChange={vi.fn()}
      />,
    );
    expect(
      screen.getByRole("button", { name: "Pan and select" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByRole("button", {
        name: "Isochrone from a point. This tool arrives in a later release.",
      }),
    ).toHaveAttribute("aria-disabled", "true");
  });

  it("enables Measure when DuckDB Spatial is unavailable", () => {
    render(
      <MapToolCluster
        mapToolMode={{ type: "pan" }}
        onMapToolModeChange={vi.fn()}
      />,
    );

    const measureTool = screen.getByRole("button", {
      name: "Measure distance and area",
    });
    expect(measureTool).not.toHaveAttribute("aria-disabled", "true");
  });

  it("clears the measure readout after returning to Pan", () => {
    const updateConfig = vi.fn();
    const fakeMap = createFakeMap();
    render(
      <MeasureToolHarness updateConfig={updateConfig} fakeMap={fakeMap} />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Measure distance and area" }),
    );
    act(() => {
      fakeMap.emitClick(0, 0);
      fakeMap.emitClick(1, 0);
    });

    expect(screen.getByText("111.2 km")).toBeInTheDocument();
    expect(updateConfig).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Pan and select" }));

    expect(screen.queryByText("111.2 km")).toBeNull();
    expect(updateConfig).not.toHaveBeenCalled();
  });

  it("disables Area when DuckDB Spatial is unavailable", () => {
    render(
      <MapToolCluster
        mapToolMode={{ type: "pan" }}
        onMapToolModeChange={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("button", {
        name: "Draw an area to filter by. This tool needs DuckDB Spatial, which is unavailable.",
      }),
    ).toHaveAttribute("aria-disabled", "true");
  });

  it("enables Area when DuckDB Spatial is available", () => {
    spatialAvailability.value = "available";
    render(
      <MapToolCluster
        mapToolMode={{ type: "pan" }}
        onMapToolModeChange={vi.fn()}
      />,
    );

    const areaTool = screen.getByRole("button", {
      name: "Draw an area to filter by",
    });
    expect(areaTool).not.toHaveAttribute("aria-disabled", "true");
  });

  it("sets Area aria-pressed when the Area tool is clicked", () => {
    spatialAvailability.value = "available";
    function Harness(): ReactNode {
      const [mapToolMode, setMapToolMode] = useState<MapToolMode>({
        type: "pan",
      });
      return (
        <MapToolCluster
          mapToolMode={mapToolMode}
          onMapToolModeChange={setMapToolMode}
        />
      );
    }
    render(<Harness />);

    fireEvent.click(
      screen.getByRole("button", { name: "Draw an area to filter by" }),
    );

    expect(
      screen.getByRole("button", { name: "Draw an area to filter by" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByRole("button", { name: "Pan and select" }),
    ).toHaveAttribute("aria-pressed", "false");
  });

  it("returns to Pan on Escape without writing aoi", () => {
    spatialAvailability.value = "available";
    let config = AvaMapConfig.makeEmpty();
    const updateConfig = vi.fn(
      (update: (current: AvaMapConfig.T) => AvaMapConfig.T) => {
        config = update(config);
      },
    );
    const fakeMap = createFakeMap();
    render(<AreaToolHarness updateConfig={updateConfig} fakeMap={fakeMap} />);

    fireEvent.click(
      screen.getByRole("button", { name: "Draw an area to filter by" }),
    );
    act(() => {
      fakeMap.emitClick(0, 0);
      fakeMap.emitClick(1, 0);
    });
    fireEvent.keyDown(window, { key: "Escape" });

    expect(
      screen.getByRole("button", { name: "Pan and select" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(config.aoi).toBeUndefined();
    expect(updateConfig).not.toHaveBeenCalled();
  });

  it("writes mapConfig.aoi when a valid ring is committed", () => {
    spatialAvailability.value = "available";
    let config = AvaMapConfig.makeEmpty();
    const updateConfig = vi.fn(
      (update: (current: AvaMapConfig.T) => AvaMapConfig.T) => {
        config = update(config);
      },
    );
    const fakeMap = createFakeMap();
    render(<AreaToolHarness updateConfig={updateConfig} fakeMap={fakeMap} />);

    fireEvent.click(
      screen.getByRole("button", { name: "Draw an area to filter by" }),
    );
    act(() => {
      fakeMap.emitClick(0, 0);
      fakeMap.emitClick(1, 0);
      fakeMap.emitClick(1, 1);
      fakeMap.emitClick(0, 1);
    });
    fireEvent.keyDown(window, { key: "Enter" });

    expect(config.aoi).toEqual({
      type: "Polygon",
      coordinates: [
        [
          [0, 0],
          [1, 0],
          [1, 1],
          [0, 1],
          [0, 0],
        ],
      ],
    });
  });

  it("inserts a named buffer layer from the selected polygon layer", async () => {
    spatialAvailability.value = "available";
    const source = {
      ...MapLayer.createArea("Cases"),
      geoBinding: {
        type: "geometryColumn" as const,
        column: uuid<QueryColumn.Id>(),
        encoding: "wkt" as const,
        family: "polygon" as const,
        simplification: { tolerancePixels: 0.75 },
        sourceCrs: undefined,
      },
    };
    let config = AvaMapConfig.withLayerAdded({
      config: AvaMapConfig.makeEmpty(),
      layer: source,
    });
    const updateConfig = vi.fn(
      (update: (current: AvaMapConfig.T) => AvaMapConfig.T) => {
        config = update(config);
      },
    );

    render(
      <MapToolCluster
        mapToolMode={{ type: "pan" }}
        onMapToolModeChange={vi.fn()}
        selectedLayer={source}
        updateConfig={updateConfig}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Buffer around a layer" }),
    );
    fireEvent.click(await screen.findByRole("button", { name: "Confirm" }));

    const buffer = config.layers[1];
    expect(buffer?.name).toBe("Buffer of Cases");
    expect(buffer?.geoBinding).toEqual({
      type: "bufferOfLayer",
      layerId: source.id,
      distanceMeters: 1000,
      dissolve: false,
    });
  });

  it("does not write aoi when the closed ring crosses itself", () => {
    spatialAvailability.value = "available";
    let config = AvaMapConfig.makeEmpty();
    const updateConfig = vi.fn(
      (update: (current: AvaMapConfig.T) => AvaMapConfig.T) => {
        config = update(config);
      },
    );
    const fakeMap = createFakeMap();
    render(<AreaToolHarness updateConfig={updateConfig} fakeMap={fakeMap} />);

    fireEvent.click(
      screen.getByRole("button", { name: "Draw an area to filter by" }),
    );
    act(() => {
      fakeMap.emitClick(0, 0);
      fakeMap.emitClick(1, 1);
      fakeMap.emitClick(1, 0);
      fakeMap.emitClick(0, 1);
    });
    fireEvent.keyDown(window, { key: "Enter" });

    expect(config.aoi).toBeUndefined();
    expect(updateConfig).not.toHaveBeenCalled();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Close a valid ring that does not cross itself.",
    );
  });
});
