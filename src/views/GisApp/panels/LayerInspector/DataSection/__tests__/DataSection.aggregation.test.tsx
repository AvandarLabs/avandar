import { uuid } from "$/lib/uuid";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@/test-utils";
import {
  createBoundLayer,
  createDataset,
  createGridBinLayer,
  fixtures,
  resetDataSectionFixtures,
} from "@/views/GisApp/panels/LayerInspector/DataSection/__tests__/DataSection.fixtures";
import { BoundarySourceControls } from "@/views/GisApp/panels/LayerInspector/DataSection/BoundarySourceControls/BoundarySourceControls";
import { DataSection } from "@/views/GisApp/panels/LayerInspector/DataSection/DataSection";
import type { LayerChangeHandler } from "@/views/GisApp/panels/LayerInspector/LayerInspector";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";

beforeEach(() => {
  resetDataSectionFixtures();
});

describe("DataSection aggregation", () => {
  it("keeps the boundary-join choice visible", () => {
    render(<DataSection layer={createBoundLayer()} onLayerChange={vi.fn()} />);
    const geometrySelect = screen
      .getAllByRole("combobox", { name: "Geometry" })
      .at(-1)!;
    fireEvent.click(geometrySelect);
    expect(screen.getByText("Join to boundaries")).toBeInTheDocument();
  });

  it("changes the boundary dataset and resets its column references", () => {
    const firstBoundary = createDataset();
    const secondBoundary = createDataset();
    const firstColumns = [
      fixtures.latitudeColumn.baseColumn as DatasetColumn.T,
      fixtures.longitudeColumn.baseColumn as DatasetColumn.T,
    ];
    const secondColumns = [
      fixtures.nameColumn.baseColumn as DatasetColumn.T,
      fixtures.geometryColumn.baseColumn as DatasetColumn.T,
    ];
    const layer = {
      ...MapLayer.createArea("Cases by district"),
      source: {
        ...MapLayer.createArea("Cases by district").source,
        dataSource: fixtures.dataSource,
        queryColumns: [fixtures.nameColumn],
      },
      geoBinding: {
        type: "joinToBoundaries" as const,
        dataKeyColumn: fixtures.nameColumn.id,
        matching: "exact" as const,
        boundary: {
          datasetId: firstBoundary.id,
          geometryColumnId: firstColumns[0]!.id,
          geometryEncoding: "wkt" as const,
          keyColumnId: firstColumns[1]!.id,
          displayNameColumnId: undefined,
          simplification: { tolerancePixels: 0.75 },
        },
        aggregation: {
          operation: "count" as const,
          outputValueId: uuid<MapLayer.AreaAggregationOutputId>(),
        },
      },
    };
    const onLayerChange = vi.fn<LayerChangeHandler>();
    render(
      <BoundarySourceControls
        layer={layer}
        dataKeyColumn={fixtures.nameColumn}
        options={[
          { dataset: firstBoundary, label: "First", columns: firstColumns },
          { dataset: secondBoundary, label: "Second", columns: secondColumns },
        ]}
        onLayerChange={onLayerChange}
      />,
    );

    const datasetSelect = screen.getByRole("combobox", {
      name: "Boundary dataset",
    });
    expect(datasetSelect).not.toHaveAttribute("data-read-only");
    fireEvent.click(datasetSelect);
    fireEvent.click(
      screen.getByRole("option", { name: "Second", hidden: true }),
    );

    const updated = onLayerChange.mock.calls[0]![0](layer);
    expect(updated.geoBinding).toMatchObject({
      boundary: {
        datasetId: secondBoundary.id,
        geometryColumnId: secondColumns[0]!.id,
        keyColumnId: secondColumns[1]!.id,
      },
    });
  });

  it("offers point aggregation into boundaries", () => {
    render(<DataSection layer={createBoundLayer()} onLayerChange={vi.fn()} />);
    const geometrySelect = screen
      .getAllByRole("combobox", { name: "Geometry" })
      .at(-1)!;

    fireEvent.click(geometrySelect);

    expect(
      screen.getByText("Aggregate points to boundaries"),
    ).toBeInTheDocument();
  });

  it("allows aggregate-only layers to select grid binning", () => {
    const layer = MapLayer.withSensitivity(MapLayer.createArea("Cases"), {
      mode: "aggregateOnly",
      minCellCount: 5,
      minGeoLevel: "hex",
    });
    const onLayerChange = vi.fn<LayerChangeHandler>();
    render(<DataSection layer={layer} onLayerChange={onLayerChange} />);
    onLayerChange.mockClear();
    const geometrySelect = screen
      .getAllByRole("combobox", { name: "Geometry" })
      .at(-1)!;

    fireEvent.click(geometrySelect);
    fireEvent.click(
      screen.getByRole("option", { name: "Bin into a grid", hidden: true }),
    );

    const updatedLayer = onLayerChange.mock.calls[0]![0](layer);
    expect(updatedLayer.geoBinding?.type).toBe("binPointsToGrid");
    expect(updatedLayer.sensitivity.mode).toBe("aggregateOnly");
  });

  it("clamps grid cell size to the supported meter range", () => {
    const layer = createGridBinLayer();
    const onLayerChange = vi.fn<LayerChangeHandler>();
    render(<DataSection layer={layer} onLayerChange={onLayerChange} />);

    fireEvent.change(
      screen.getByRole("textbox", { name: "Cell size (meters)" }),
      { target: { value: "50" } },
    );

    const updatedLayer = onLayerChange.mock.calls[0]![0](layer);
    expect(updatedLayer.geoBinding).toMatchObject({ sizeMeters: 100 });
  });
});
