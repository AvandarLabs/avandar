import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
/**
 * Tool cluster: Area gating, pressed state, Escape, and AOI commit.
 */
import { uuid } from "$/lib/uuid";
import { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { act, fireEvent, render, screen, within } from "@/test-utils";
import {
  createFakeMap,
  emitWindowPointer,
} from "@/views/GisApp/shell/MapToolCluster/createFakeMap";
import { MapToolCluster } from "@/views/GisApp/shell/MapToolCluster/MapToolCluster";
import {
  AreaToolHarness,
  MeasureToolHarness,
} from "@/views/GisApp/shell/MapToolCluster/mapToolClusterHarness";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import type { FeatureFlag } from "@/config/FeatureFlagConfig";
import type { MapToolMode } from "@/views/GisApp/tools/MapToolMode.types";
import type { ReactNode } from "react";

const spatialAvailability = vi.hoisted(() => {
  return {
    value: "unavailable" as "loading" | "available" | "unavailable",
  };
});

const isochroneFlag = vi.hoisted(() => {
  return { enabled: false };
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

vi.mock("@/config/FeatureFlagConfig", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/config/FeatureFlagConfig")>();
  return {
    ...actual,
    isFlagEnabled: (flag: FeatureFlag) => {
      if (flag === actual.FeatureFlag.EnableGisIsochrone) {
        return isochroneFlag.enabled;
      }
      return actual.isFlagEnabled(flag);
    },
  };
});

describe("MapToolCluster", () => {
  beforeEach(() => {
    spatialAvailability.value = "unavailable";
    isochroneFlag.enabled = false;
  });

  afterEach(() => {
    document.querySelectorAll("canvas").forEach((canvas) => {
      canvas.remove();
    });
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
      "Annotate the map",
      "Erase annotations",
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

    expect(
      screen.queryByRole("button", {
        name: "Isochrone from a point. This tool arrives in a later release.",
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Annotate the map" }),
    ).not.toHaveAttribute("aria-disabled", "true");
    expect(
      screen.getByRole("button", { name: "Erase annotations" }),
    ).not.toHaveAttribute("aria-disabled", "true");
  });

  it("omits isochrone when its feature flag is off", () => {
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
      screen.queryByRole("button", {
        name: "Isochrone from a point. This tool arrives in a later release.",
      }),
    ).not.toBeInTheDocument();
  });

  it("shows a disabled isochrone slot when its feature flag is on", () => {
    isochroneFlag.enabled = true;
    render(
      <MapToolCluster
        mapToolMode={{ type: "pan" }}
        onMapToolModeChange={vi.fn()}
      />,
    );
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

  it("closes the measure ring when the first vertex is clicked", () => {
    const fakeMap = createFakeMap();
    render(<MeasureToolHarness updateConfig={vi.fn()} fakeMap={fakeMap} />);

    fireEvent.click(
      screen.getByRole("button", { name: "Measure distance and area" }),
    );
    act(() => {
      fakeMap.emitClick(0, 0);
      fakeMap.emitClick(40, 0);
      fakeMap.emitClick(20, 40);
    });
    act(() => {
      fakeMap.emitClick(8, 0);
    });

    expect(
      screen.getByRole("status", { name: "Measure readout" }),
    ).toHaveTextContent("·");
  });

  it("does not close the measure ring on double-click", () => {
    const fakeMap = createFakeMap();
    render(<MeasureToolHarness updateConfig={vi.fn()} fakeMap={fakeMap} />);

    fireEvent.click(
      screen.getByRole("button", { name: "Measure distance and area" }),
    );
    act(() => {
      fakeMap.emitClick(0, 0);
      fakeMap.emitClick(40, 0);
      fakeMap.emitClick(20, 40);
    });
    act(() => {
      fakeMap.emitDblClick(20, 40);
    });

    expect(
      screen.getByRole("status", { name: "Measure readout" }),
    ).not.toHaveTextContent("·");
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

  it("clears an in-progress polygon and stays on Area on Escape", () => {
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
      fakeMap.emitDblClick(0, 0);
      fakeMap.emitClick(40, 0);
    });
    fireEvent.keyDown(window, { key: "Escape" });

    expect(
      screen.getByRole("button", { name: "Draw an area to filter by" }),
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
      fakeMap.emitPointerDown(0, 0);
      emitWindowPointer("pointermove", 10, 10);
      emitWindowPointer("pointerup", 10, 10);
    });

    expect(config.aoi).toEqual({
      type: "Polygon",
      coordinates: [
        [
          [0, 0],
          [10, 0],
          [10, 10],
          [0, 10],
          [0, 0],
        ],
      ],
    });
  });

  it("writes mapConfig.aoi from a Shift-drag lasso", () => {
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
      fakeMap.emitPointerDown(0, 0, { shiftKey: true });
      emitWindowPointer("pointermove", 4, 0, { shiftKey: true });
      emitWindowPointer("pointermove", 2, 3, { shiftKey: true });
      emitWindowPointer("pointerup", 2, 3, { shiftKey: true });
    });

    expect(config.aoi?.type).toBe("Polygon");
    expect(config.aoi?.coordinates[0]?.[0]).toEqual([0, 0]);
    expect(config.aoi?.coordinates[0]?.at(-1)).toEqual([0, 0]);
  });

  it("closes a polygon trail when the first vertex is clicked", () => {
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
      fakeMap.emitDblClick(0, 0);
      fakeMap.emitClick(4, 0);
      fakeMap.emitClick(2, 3);
      fakeMap.emitClick(0, 0);
    });

    expect(config.aoi).toEqual({
      type: "Polygon",
      coordinates: [
        [
          [0, 0],
          [4, 0],
          [2, 3],
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
      fakeMap.emitDblClick(0, 0);
      fakeMap.emitClick(40, 40);
      fakeMap.emitClick(40, 0);
      fakeMap.emitClick(0, 40);
    });
    fireEvent.keyDown(window, { key: "Enter" });

    expect(config.aoi).toBeUndefined();
    expect(updateConfig).not.toHaveBeenCalled();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Close a valid ring that does not cross itself.",
    );
  });
});
