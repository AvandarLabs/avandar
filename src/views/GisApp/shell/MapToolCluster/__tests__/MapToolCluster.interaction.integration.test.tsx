import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { uuid } from "$/lib/uuid";
import { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { act, fireEvent, render, screen } from "@/test-utils";
import {
  createFakeMap,
  emitWindowPointer,
} from "@/views/GisApp/shell/MapToolCluster/createFakeMap";
import { MapToolCluster } from "@/views/GisApp/shell/MapToolCluster/MapToolCluster";
import { AreaToolHarness } from "@/views/GisApp/shell/MapToolCluster/mapToolClusterHarness";
import {
  isochroneFlag,
  spatialAvailability,
} from "../MapToolClusterTestHelpers";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";

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
      distanceUnit: "m",
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

/* Register fixture mocks before Vitest loads the component dependencies. */
await vi.hoisted(async () => {
  await import("../MapToolClusterTestHelpers");
});
