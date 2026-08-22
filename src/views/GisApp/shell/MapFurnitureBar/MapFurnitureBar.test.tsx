import type { MapInstance } from "@/views/GisApp/MapCanvas/useMapInstance";

import { describe, expect, it, vi } from "vitest";

import { render, screen } from "@/test-utils";
import { MapFurnitureBar } from "@/views/GisApp/shell/MapFurnitureBar/MapFurnitureBar";
import { MapScale } from "@/views/GisApp/shell/MapFurnitureBar/MapScale/MapScale";
import { useMapPointerCoordinates } from "@/views/GisApp/shell/MapFurnitureBar/useMapPointerCoordinates/useMapPointerCoordinates";

vi.mock(
  "@/views/GisApp/shell/MapFurnitureBar/useMapPointerCoordinates/useMapPointerCoordinates",
  () => {
    return {
      useMapPointerCoordinates: vi.fn(),
    };
  },
);
vi.mock("@/views/GisApp/shell/MapFurnitureBar/MapScale/MapScale", () => {
  return {
    MapScale: { useMapScale: vi.fn() },
  };
});

/** Renders `MapFurnitureBar` with the shared mock map instance and options. */
function _renderFurnitureBar(
  options: Readonly<{
    attribution?: string;
    disclaimer: string | undefined;
  }>,
): void {
  render(
    <MapFurnitureBar
      mapInstance={{} as MapInstance}
      attribution={options.attribution ?? "© OpenStreetMap contributors"}
      disclaimer={options.disclaimer}
    />,
  );
}

describe("MapFurnitureBar", () => {
  it("renders coordinates, scale, attribution, and the boundary disclaimer", () => {
    vi.mocked(useMapPointerCoordinates).mockReturnValue({
      longitude: -73.987,
      latitude: 40.748,
    });
    vi.mocked(MapScale.useMapScale).mockReturnValue({
      kind: "bar",
      widthPx: 50,
      meters: 5000,
    });

    _renderFurnitureBar({ disclaimer: undefined });

    expect(screen.getByText("40.748 N, 73.987 W")).toBeInTheDocument();
    expect(screen.getByText("5 km")).toBeInTheDocument();
    expect(
      screen.getByText("© OpenStreetMap contributors"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "The boundaries and names shown do not imply official endorsement or acceptance.",
      ),
    ).toBeInTheDocument();
  });

  it("shows the coordinate prompt and varying-scale message when needed", () => {
    vi.mocked(useMapPointerCoordinates).mockReturnValue(undefined);
    vi.mocked(MapScale.useMapScale).mockReturnValue({ kind: "varies" });

    _renderFurnitureBar({ attribution: "© Example", disclaimer: undefined });

    expect(
      screen.getByText("Move the pointer over the map to read a coordinate"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Scale varies across this map"),
    ).toBeInTheDocument();
  });

  it("shows the localized default disclaimer when none is persisted", () => {
    _renderFurnitureBar({ disclaimer: undefined });

    expect(
      screen.getByText(
        "The boundaries and names shown do not imply official endorsement or acceptance.",
      ),
    ).toBeInTheDocument();
  });

  it("shows the persisted disclaimer verbatim", () => {
    _renderFurnitureBar({ disclaimer: "Our own required wording." });

    expect(screen.getByText("Our own required wording.")).toBeInTheDocument();
  });
});
