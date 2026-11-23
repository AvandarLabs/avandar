import { Model } from "@avandar/models";
import { describe, expect, it, vi } from "vitest";
import { uuid } from "$/lib/uuid";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import { getResolvedMapLayerMetadata } from "@/clients/maps/MapLayerSpatialQuery/getResolvedMapLayerMetadata/getResolvedMapLayerMetadata";
import { fireEvent, render, screen } from "@/test-utils";
import { PointAggregationControls } from "@/views/GisApp/panels/LayerInspector/DataSection/PointAggregationControls/PointAggregationControls";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { LayerChangeHandler } from "@/views/GisApp/panels/LayerInspector/LayerInspector";

const DATASET_ID = uuid<Dataset.Id>();

function _createDatasetColumn(name: string): DatasetColumn.T {
  const now = new Date().toISOString();
  return Model.make("DatasetColumn", {
    id: uuid<DatasetColumn.Id>(),
    datasetId: DATASET_ID,
    workspaceId: uuid(),
    createdAt: now,
    updatedAt: now,
    name,
    originalName: name,
    originalDataType: "VARCHAR",
    dataType: "varchar",
    detectedDataType: "VARCHAR",
    description: undefined,
    columnIdx: 0,
  });
}

const schoolIdColumn = _createDatasetColumn("school_id");
const locationColumn = _createDatasetColumn("location");
const latitudeColumn = _createDatasetColumn("latitude");
const longitudeColumn = _createDatasetColumn("longitude");

/**
 * A column select builds its own query columns from the dataset's columns,
 * the way the real one does, so its ids differ from the inspector's.
 */
vi.mock(
  "@/views/DataExplorerApp/QueryColumnSingleSelect/QueryColumnSingleSelect",
  () => {
    return {
      QueryColumnSingleSelect: ({
        label,
        onChange,
      }: {
        label: string;
        onChange: (column: QueryColumn.T | null) => void;
      }) => {
        const datasetColumn = new Map([
          ["Point geometry column", locationColumn],
          ["Latitude", latitudeColumn],
          ["Longitude", longitudeColumn],
        ]).get(label);
        return (
          <button
            aria-label={label}
            onClick={() => {
              onChange(
                datasetColumn
                  ? QueryColumn.makeFromDatasetColumn(datasetColumn)
                  : null,
              );
            }}
          >
            {label}
          </button>
        );
      },
    };
  },
);

const sourceColumns = [
  schoolIdColumn,
  locationColumn,
  latitudeColumn,
  longitudeColumn,
].map((column) => {
  return QueryColumn.makeFromDatasetColumn(column);
});

function _createAggregatingLayer(points: MapLayer.PointBinding): MapLayer.T {
  const layer = MapLayer.createArea("Schools by ZIP");
  return {
    ...layer,
    source: { ...layer.source, queryColumns: [] },
    geoBinding: {
      type: "aggregatePointsToBoundaries",
      points,
      boundary: {
        datasetId: uuid<Dataset.Id>(),
        geometryColumnId: uuid<DatasetColumn.Id>(),
        geometryEncoding: "wkt",
        keyColumnId: uuid<DatasetColumn.Id>(),
        displayNameColumnId: undefined,
        simplification: { tolerancePixels: 0.75 },
      },
      aggregation: {
        operation: "count",
        outputValueId: uuid<MapLayer.AreaAggregationOutputId>(),
      },
    },
  } as MapLayer.T;
}

/** Applies every change the controls made to `layer`, in order. */
function _pickColumns(
  layer: MapLayer.T,
  labels: readonly string[],
): MapLayer.T {
  const onLayerChange = vi.fn<LayerChangeHandler>();
  render(
    <PointAggregationControls
      layer={layer}
      options={[]}
      sourceColumns={sourceColumns}
      onLayerChange={onLayerChange}
    />,
  );
  labels.forEach((label) => {
    fireEvent.click(screen.getByRole("button", { name: label }));
  });
  return onLayerChange.mock.calls.reduce((currentLayer, [update]) => {
    return update(currentLayer);
  }, layer);
}

/** The name of the query column a point binding id points at, if any. */
function _getBoundColumnName(
  layer: MapLayer.T,
  columnId: string | undefined,
): string | undefined {
  return layer.source.queryColumns.find((column) => {
    return column.id === columnId;
  })?.baseColumn.name;
}

function _getPoints(layer: MapLayer.T): MapLayer.PointBinding | undefined {
  return layer.geoBinding?.type === "aggregatePointsToBoundaries"
    ? layer.geoBinding.points
    : undefined;
}

function _getRebindReason(layer: MapLayer.T): string | undefined {
  const resolution = getResolvedMapLayerMetadata({
    layer,
    datasets: [],
    datasetColumns: [],
  });
  return resolution.type === "rebindRequired" ? resolution.reason : undefined;
}

describe("PointAggregationControls", () => {
  it("keeps a picked point geometry column in the layer's query", () => {
    const layer = _createAggregatingLayer({
      type: "geometryColumn",
      column: sourceColumns[0]!.id,
      encoding: "wkt",
      family: "point",
      simplification: undefined,
      sourceCrs: undefined,
    });

    const updatedLayer = _pickColumns(layer, ["Point geometry column"]);

    const points = _getPoints(updatedLayer);
    expect(
      _getBoundColumnName(
        updatedLayer,
        points?.type === "geometryColumn" ? points.column : undefined,
      ),
    ).toBe("location");
    expect(_getRebindReason(updatedLayer)).not.toBe("missingSourceColumn");
  });

  it("keeps a picked latitude column in the layer's query", () => {
    const layer = _createAggregatingLayer({
      type: "latLngColumns",
      latitude: undefined,
      longitude: undefined,
    });

    const updatedLayer = _pickColumns(layer, ["Latitude"]);

    const points = _getPoints(updatedLayer);
    expect(
      _getBoundColumnName(
        updatedLayer,
        points?.type === "latLngColumns" ? points.latitude : undefined,
      ),
    ).toBe("latitude");
    expect(_getRebindReason(updatedLayer)).not.toBe("missingSourceColumn");
  });
});
