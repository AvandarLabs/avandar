import { Model } from "@avandar/models";
import { uuid } from "$/lib/uuid";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import { describe, expect, it } from "vitest";
import { getClusterTableColumns } from "@/views/GisApp/panels/FeatureInspector/ClusterFeatureTable/getClusterTableColumns/getClusterTableColumns";
import { getClusterTableColumnsFromLeaves } from "@/views/GisApp/panels/FeatureInspector/ClusterFeatureTable/getClusterTableColumnsFromLeaves/getClusterTableColumnsFromLeaves";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { Workspace } from "$/models/Workspace/Workspace";

function _makeDatasetColumn(name: string): DatasetColumn.T {
  const now = new Date().toISOString();
  return Model.make("DatasetColumn", {
    id: uuid<DatasetColumn.Id>(),
    datasetId: uuid<Dataset.Id>(),
    workspaceId: uuid<Workspace.Id>(),
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

function _makeLayer(
  options: Readonly<{
    columnNames: readonly string[];
    popup: MapLayer.Popup;
  }>,
): MapLayer.T {
  const layer = MapLayer.makeEmpty("Cases");
  const queryColumns = options.columnNames.map((name) => {
    return QueryColumn.makeFromDatasetColumn(_makeDatasetColumn(name));
  });
  return {
    ...layer,
    source: { ...layer.source, queryColumns },
    popup: options.popup,
  };
}

function _makeFeature(properties: Record<string, unknown>): GeoJSON.Feature {
  return {
    type: "Feature",
    id: 0,
    geometry: { type: "Point", coordinates: [0, 0] },
    properties,
  };
}

describe("getClusterTableColumns", () => {
  it("uses the layer's explicitly selected popup columns, not the leaves' properties", () => {
    const layer = _makeLayer({
      columnNames: ["name", "region"],
      popup: { columnIds: "all", action: undefined },
    });
    const [nameColumn] = layer.source.queryColumns;
    const layerWithSelection: MapLayer.T = {
      ...layer,
      popup: { columnIds: [nameColumn!.id], action: undefined },
    };

    const columns = getClusterTableColumns({
      layer: layerWithSelection,
      leaves: [_makeFeature({ name: "Clinic A", extra: "ignored" })],
    });

    expect(columns).toEqual({ source: "properties", keys: ["name"] });
  });

  it("enumerates every query column when the popup shows all fields, regardless of what a page's leaves happen to carry", () => {
    const layer = _makeLayer({
      columnNames: ["name", "region"],
      popup: { columnIds: "all", action: undefined },
    });

    const page1Columns = getClusterTableColumns({
      layer,
      leaves: [_makeFeature({ name: "Clinic A" })],
    });
    const page2Columns = getClusterTableColumns({
      layer,
      leaves: [_makeFeature({ region: "North" })],
    });

    expect(page1Columns).toEqual({
      source: "properties",
      keys: ["name", "region"],
    });
    expect(page2Columns).toEqual(page1Columns);
  });

  it("falls back to the leaves' own properties when no layer is known", () => {
    const leaves = [_makeFeature({ name: "Clinic A" })];

    expect(getClusterTableColumns({ layer: undefined, leaves })).toEqual(
      getClusterTableColumnsFromLeaves(leaves),
    );
  });

  it("falls back to the leaves' own properties when the layer's query has no columns", () => {
    const layer = _makeLayer({
      columnNames: [],
      popup: { columnIds: "all", action: undefined },
    });
    const leaves = [_makeFeature({ name: "Clinic A" })];

    expect(getClusterTableColumns({ layer, leaves })).toEqual(
      getClusterTableColumnsFromLeaves(leaves),
    );
  });
});
