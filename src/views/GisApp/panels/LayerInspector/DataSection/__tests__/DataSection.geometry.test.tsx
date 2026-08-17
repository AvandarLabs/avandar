import {
  createBoundLayer,
  createGeometryLayer,
  resetDataSectionFixtures,
  spatialAvailability,
} from "@/views/GisApp/panels/LayerInspector/DataSection/__tests__/DataSection.fixtures";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@/test-utils";
import { DataSection } from "@/views/GisApp/panels/LayerInspector/DataSection/DataSection";

beforeEach(() => {
  resetDataSectionFixtures();
});

describe("DataSection geometry", () => {
  it("shows the complete geometry-column controls", () => {
    render(
      <DataSection layer={createGeometryLayer()} onLayerChange={vi.fn()} />,
    );

    expect(
      screen.getByRole("button", { name: "Geometry column" }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole("combobox", { name: "Encoding" }).at(-1),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole("combobox", { name: "Expected geometry" }).at(-1),
    ).toBeInTheDocument();
    expect(screen.getByText("Advanced geometry settings")).toBeInTheDocument();
  });

  it("keeps geometry columns visible but disabled while Spatial loads", () => {
    spatialAvailability.value = "loading";
    render(<DataSection layer={createBoundLayer()} onLayerChange={vi.fn()} />);

    const geometrySelect = screen
      .getAllByRole("combobox", { name: "Geometry" })
      .at(-1)!;
    fireEvent.click(geometrySelect);
    expect(
      screen.getAllByText("Geometry column").at(-1)?.closest('[role="option"]'),
    ).toHaveAttribute("data-combobox-disabled", "true");
    expect(
      screen.getByText("Bin into a grid").closest('[role="option"]'),
    ).toHaveAttribute("data-combobox-disabled", "true");
    expect(
      screen.getByText(
        "Geometry columns are available when Spatial finishes loading.",
      ),
    ).toBeInTheDocument();
  });

  it("explains when Spatial is unavailable", () => {
    spatialAvailability.value = "unavailable";
    render(<DataSection layer={createBoundLayer()} onLayerChange={vi.fn()} />);

    const geometrySelect = screen
      .getAllByRole("combobox", { name: "Geometry" })
      .at(-1)!;
    fireEvent.click(geometrySelect);
    expect(
      screen.getAllByText("Geometry column").at(-1)?.closest('[role="option"]'),
    ).toHaveAttribute("data-combobox-disabled", "true");
    expect(
      screen.getByText(
        "Geometry columns need DuckDB Spatial, which is unavailable.",
      ),
    ).toBeInTheDocument();
  });
});
