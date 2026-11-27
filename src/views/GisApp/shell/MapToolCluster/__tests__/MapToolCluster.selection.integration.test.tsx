import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@/test-utils";
import { createFakeMap } from "@/views/GisApp/shell/MapToolCluster/createFakeMap";
import { MapToolCluster } from "@/views/GisApp/shell/MapToolCluster/MapToolCluster";
import { MeasureToolHarness } from "@/views/GisApp/shell/MapToolCluster/mapToolClusterHarness";
import {
  isochroneFlag,
  spatialAvailability,
} from "../MapToolClusterTestHelpers";
import type { MapToolMode } from "@/views/GisApp/tools/MapToolMode.types";
import type { ReactNode } from "react";

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
      "Draw an area to filter by. This tool needs geometry support, which could not be loaded.",
      "Measure distance and area",
      "Buffer around a layer. This tool needs geometry support, which could not be loaded.",
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
        name: "Draw an area to filter by. This tool needs geometry support, which could not be loaded.",
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
});

/* Register fixture mocks before Vitest loads the component dependencies. */
await vi.hoisted(async () => {
  await import("../MapToolClusterTestHelpers");
});
