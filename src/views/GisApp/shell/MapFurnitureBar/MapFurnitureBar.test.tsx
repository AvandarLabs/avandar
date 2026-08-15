import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@/test-utils";
import { MapFurnitureBar } from "@/views/GisApp/shell/MapFurnitureBar/MapFurnitureBar";
import { MapScale } from "@/views/GisApp/shell/MapFurnitureBar/MapScale/MapScale";
import { useMapPointerCoordinates } from "@/views/GisApp/shell/MapFurnitureBar/useMapPointerCoordinates/useMapPointerCoordinates";
import type { MapInstance } from "@/views/GisApp/MapCanvas/useMapInstance";

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

    render(
      <MapFurnitureBar
        mapInstance={{} as MapInstance}
        attribution="© OpenStreetMap contributors"
      />,
    );

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

    render(
      <MapFurnitureBar
        mapInstance={{} as MapInstance}
        attribution="© Example"
      />,
    );

    expect(
      screen.getByText("Move the pointer over the map to read a coordinate"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Scale varies across this map"),
    ).toBeInTheDocument();
  });
});
