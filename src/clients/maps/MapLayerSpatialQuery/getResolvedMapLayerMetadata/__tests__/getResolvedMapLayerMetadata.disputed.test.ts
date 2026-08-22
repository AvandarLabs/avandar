import { describe, expect, it } from "vitest";
import { uuid } from "$/lib/uuid";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import { getResolvedMapLayerMetadata } from "../getResolvedMapLayerMetadata";
import {
  createColumn,
  createDataset,
  createGridBinLayer,
  createResolvedFixture,
} from "./getResolvedMapLayerMetadata.fixtures";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";

describe("getResolvedMapLayerMetadata disputed-status column", () => {
  it("resolves a text boundary disputed column", () => {
    const fixture = createResolvedFixture();
    const statusColumn = createColumn({
      dataset: fixture.boundaryDataset,
      name: "status",
    });
    const layer: MapLayer.T = {
      ...fixture.layer,
      disputedStatusColumn: {
        type: "boundaryColumn",
        column: statusColumn.id,
      },
    };

    const result = getResolvedMapLayerMetadata({
      layer,
      datasets: [fixture.sourceDataset, fixture.boundaryDataset],
      datasetColumns: [
        fixture.sourceKeyColumn,
        fixture.measureDatasetColumn,
        fixture.geometryColumn,
        fixture.keyColumn,
        statusColumn,
      ],
    });

    expect(result).toMatchObject({
      type: "resolved",
      disputedStatusColumn: { type: "boundaryColumn", columnName: "status" },
    });
  });

  it("requires a rebind when the disputed column is numeric", () => {
    const fixture = createResolvedFixture();
    const numericColumn = createColumn({
      dataset: fixture.boundaryDataset,
      name: "status_code",
      dataType: "double",
    });
    const layer: MapLayer.T = {
      ...fixture.layer,
      disputedStatusColumn: {
        type: "boundaryColumn",
        column: numericColumn.id,
      },
    };

    const result = getResolvedMapLayerMetadata({
      layer,
      datasets: [fixture.sourceDataset, fixture.boundaryDataset],
      datasetColumns: [
        fixture.sourceKeyColumn,
        fixture.measureDatasetColumn,
        fixture.geometryColumn,
        fixture.keyColumn,
        numericColumn,
      ],
    });

    expect(result).toEqual({
      type: "rebindRequired",
      reason: "disputedStatusColumnNotText",
      referenceId: numericColumn.id,
    });
  });

  it("requires a rebind when the disputed column is gone", () => {
    const fixture = createResolvedFixture();
    const removedColumnId = uuid<DatasetColumn.Id>();
    const layer: MapLayer.T = {
      ...fixture.layer,
      disputedStatusColumn: {
        type: "boundaryColumn",
        column: removedColumnId,
      },
    };

    const result = getResolvedMapLayerMetadata({
      layer,
      datasets: [fixture.sourceDataset, fixture.boundaryDataset],
      datasetColumns: [
        fixture.sourceKeyColumn,
        fixture.measureDatasetColumn,
        fixture.geometryColumn,
        fixture.keyColumn,
      ],
    });

    expect(result).toEqual({
      type: "rebindRequired",
      reason: "missingDisputedStatusColumn",
      referenceId: removedColumnId,
    });
  });

  it("requires a rebind when a boundary column is bound with no boundary", () => {
    const sourceDataset = createDataset("Cases");
    const pointsColumn = createColumn({
      dataset: sourceDataset,
      name: "location",
    });
    const measureDatasetColumn = createColumn({
      dataset: sourceDataset,
      name: "case_count",
      dataType: "double",
    });
    const boundColumnId = uuid<DatasetColumn.Id>();
    const gridLayer = createGridBinLayer({
      sourceDataset,
      points: QueryColumn.makeFromDatasetColumn(pointsColumn),
      measureColumn: QueryColumn.makeFromDatasetColumn(measureDatasetColumn),
    });
    const layer: MapLayer.T = {
      ...gridLayer,
      disputedStatusColumn: {
        type: "boundaryColumn",
        column: boundColumnId,
      },
    };

    const result = getResolvedMapLayerMetadata({
      layer,
      datasets: [sourceDataset],
      datasetColumns: [pointsColumn, measureDatasetColumn],
    });

    expect(result).toEqual({
      type: "rebindRequired",
      reason: "unsupportedDisputedStatusColumn",
      referenceId: boundColumnId,
    });
  });

  it("resolves a text source disputed column", () => {
    const fixture = createResolvedFixture();
    const sourceKeyQueryColumnId = fixture.layer.source.queryColumns[0]?.id;
    if (!sourceKeyQueryColumnId) {
      throw new Error("Expected a source key query column");
    }
    const layer: MapLayer.T = {
      ...fixture.layer,
      disputedStatusColumn: {
        type: "queryColumn",
        column: sourceKeyQueryColumnId,
      },
    };

    const result = getResolvedMapLayerMetadata({
      layer,
      datasets: [fixture.sourceDataset, fixture.boundaryDataset],
      datasetColumns: [
        fixture.sourceKeyColumn,
        fixture.measureDatasetColumn,
        fixture.geometryColumn,
        fixture.keyColumn,
      ],
    });

    expect(result).toMatchObject({
      type: "resolved",
      disputedStatusColumn: {
        type: "queryColumn",
        columnName: "district_code",
      },
    });
  });
});
