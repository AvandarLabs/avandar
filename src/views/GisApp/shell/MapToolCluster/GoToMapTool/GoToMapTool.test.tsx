import { describe, expect, it, vi } from "vitest";
/**
 * Go-to search: coordinate fly, P-code lookup, and inline errors.
 */
import { uuid } from "$/lib/uuid";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { MapLayerSpatialFeatureProperties } from "@/clients/maps/MapLayerSpatialQuery/MapLayerSpatialQuery.constants";
import { fireEvent, render, screen } from "@/test-utils";
import { GoToMapTool } from "@/views/GisApp/shell/MapToolCluster/GoToMapTool/GoToMapTool";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import type { MapBounds } from "@/views/GisApp/layers/getBoundsFromFeatureCollection/getBoundsFromFeatureCollection";

function _submitGoTo(value: string): void {
  const input = screen.getByRole("textbox", {
    name: "Go to a coordinate or P-code",
  });
  fireEvent.change(input, { target: { value } });
  fireEvent.submit(input.closest("form")!);
}

function _createBoundaryLayer(): MapLayer.T {
  const layer = MapLayer.createArea("Districts");
  return {
    ...layer,
    geoBinding: {
      type: "joinToBoundaries",
      dataKeyColumn: uuid<QueryColumn.Id>(),
      matching: "exact",
      aggregation: {
        operation: "count",
        outputValueId: uuid<MapLayer.AreaAggregationOutputId>(),
      },
      boundary: {
        datasetId: uuid<Dataset.Id>(),
        geometryColumnId: uuid<DatasetColumn.Id>(),
        geometryEncoding: "wkt",
        keyColumnId: uuid<DatasetColumn.Id>(),
        displayNameColumnId: undefined,
        simplification: { tolerancePixels: 0.75 },
      },
    },
  };
}

function _createPcodeFeature(code: string): GeoJSON.Feature {
  return {
    type: "Feature",
    properties: {
      [MapLayerSpatialFeatureProperties.boundaryKey]: code,
      [MapLayerSpatialFeatureProperties.boundaryName]: "North Kivu",
    },
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [0, 0],
          [2, 0],
          [2, 2],
          [0, 2],
          [0, 0],
        ],
      ],
    },
  };
}

describe("GoToMapTool", () => {
  it("keeps the search field available without Spatial", () => {
    render(<GoToMapTool requestFitBounds={vi.fn()} />);

    const field = screen.getByRole("textbox", {
      name: "Go to a coordinate or P-code",
    });
    expect(field).not.toHaveAttribute("aria-disabled", "true");
    expect(field).not.toBeDisabled();
  });

  it("shows an inline error for an out-of-range coordinate", () => {
    render(<GoToMapTool requestFitBounds={vi.fn()} />);

    _submitGoTo("10, 181");

    expect(
      screen.getByText("That coordinate is out of range."),
    ).toBeInTheDocument();
  });

  it("reports when no boundary layer can look up a P-code", () => {
    render(<GoToMapTool requestFitBounds={vi.fn()} layers={[]} />);

    _submitGoTo("COD-NK");

    expect(
      screen.getByText("No boundary layer on this map to look up a P-code."),
    ).toBeInTheDocument();
  });

  it("reports when no loaded boundary feature matches the P-code", () => {
    const layer = _createBoundaryLayer();
    render(
      <GoToMapTool
        requestFitBounds={vi.fn()}
        layers={[layer]}
        featureCollections={
          new Map([
            [
              layer.id,
              {
                type: "FeatureCollection",
                features: [_createPcodeFeature("COD-SK")],
              },
            ],
          ])
        }
      />,
    );

    _submitGoTo("COD-NK");

    expect(screen.getByText("No matching P-code.")).toBeInTheDocument();
  });

  it("flies to a parsed coordinate on Enter", () => {
    const requestFitBounds = vi.fn<(bounds: MapBounds) => void>();
    render(<GoToMapTool requestFitBounds={requestFitBounds} />);

    _submitGoTo("10, 20");

    expect(requestFitBounds).toHaveBeenCalledTimes(1);
    const bounds = requestFitBounds.mock.calls[0]![0];
    expect(bounds[0][0]).toBeLessThan(20);
    expect(bounds[1][0]).toBeGreaterThan(20);
    expect(bounds[0][1]).toBeLessThan(10);
    expect(bounds[1][1]).toBeGreaterThan(10);
  });

  it("flies to a matching P-code feature on Enter", () => {
    const layer = _createBoundaryLayer();
    const requestFitBounds = vi.fn<(bounds: MapBounds) => void>();
    render(
      <GoToMapTool
        requestFitBounds={requestFitBounds}
        layers={[layer]}
        featureCollections={
          new Map([
            [
              layer.id,
              {
                type: "FeatureCollection",
                features: [_createPcodeFeature("COD-NK")],
              },
            ],
          ])
        }
      />,
    );

    _submitGoTo("COD-NK");

    expect(requestFitBounds).toHaveBeenCalledWith([
      [0, 0],
      [2, 2],
    ]);
  });
});
