import { Model } from "@avandar/models";
import { uuid } from "$/lib/uuid";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@/test-utils";
import { ClassificationEditor } from "./ClassificationEditor";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { Workspace } from "$/models/Workspace/Workspace";

const boundarySourceState = vi.hoisted(() => {
  return { options: [] as unknown[] };
});

vi.mock(
  "@/views/GisApp/panels/LayerInspector/DataSection/useBoundarySourceOptions/useBoundarySourceOptions",
  () => {
    return {
      useBoundarySourceOptions: () => {
        return { options: boundarySourceState.options, isLoading: false };
      },
    };
  },
);

function _createLayer(): MapLayer.T {
  const now = new Date().toISOString();
  const column = QueryColumn.makeFromDatasetColumn(
    Model.make("DatasetColumn", {
      id: uuid<DatasetColumn.Id>(),
      datasetId: uuid<Dataset.Id>(),
      workspaceId: uuid<Workspace.Id>(),
      createdAt: now,
      updatedAt: now,
      name: "Cases",
      originalName: "Cases",
      originalDataType: "DOUBLE",
      dataType: "double",
      detectedDataType: "DOUBLE",
      description: undefined,
      columnIdx: 0,
    }),
  );
  const layer = MapLayer.createArea("Districts");
  return {
    ...layer,
    source: { ...layer.source, queryColumns: [column] },
    symbology: {
      ...layer.symbology,
      color: {
        type: "graduated",
        value: { type: "queryColumn", column: column.id },
        ramp: ["#eff3ff", "#bdd7e7", "#6baed6", "#2171b5", "#08306b"],
        classification: { method: "quantile", classCount: 5 },
        normalization: undefined,
        noData: { color: "#ced4da", label: "" },
      },
    },
    legend: {
      ...layer.legend,
      breaks: [
        { lower: undefined, upper: 10 },
        { lower: 10, upper: undefined },
      ],
      entries: [
        { type: "value", color: "#eff3ff", label: "< 10", count: 4 },
        { type: "value", color: "#08306b", label: "≥ 10", count: 2 },
      ],
    },
  };
}

describe("ClassificationEditor", () => {
  it("offers numeric boundary columns as normalization denominators", () => {
    const layer = _createLayer();
    const now = new Date().toISOString();
    const boundaryDatasetId = uuid<Dataset.Id>();
    const populationColumn = Model.make("DatasetColumn", {
      id: uuid<DatasetColumn.Id>(),
      datasetId: boundaryDatasetId,
      workspaceId: uuid<Workspace.Id>(),
      createdAt: now,
      updatedAt: now,
      name: "Population",
      originalName: "Population",
      originalDataType: "DOUBLE",
      dataType: "double",
      detectedDataType: "DOUBLE",
      description: undefined,
      columnIdx: 0,
    });
    boundarySourceState.options = [
      {
        dataset: { id: boundaryDatasetId },
        columns: [populationColumn],
        label: "Boundaries",
      },
    ];
    const queryColumn = layer.source.queryColumns[0]!;
    const joinedLayer: MapLayer.T = {
      ...layer,
      geoBinding: {
        type: "joinToBoundaries",
        dataKeyColumn: queryColumn.id,
        matching: "exact",
        boundary: {
          datasetId: boundaryDatasetId,
          geometryColumnId: populationColumn.id,
          geometryEncoding: "wkt",
          keyColumnId: populationColumn.id,
          displayNameColumnId: undefined,
          simplification: { tolerancePixels: 0.75 },
        },
        aggregation: {
          operation: "count",
          outputValueId: uuid<MapLayer.AreaAggregationOutputId>(),
        },
      },
    };
    const onLayerChange = vi.fn();
    render(
      <ClassificationEditor
        layer={joinedLayer}
        onLayerChange={onLayerChange}
        onBack={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("combobox", { name: "Normalize by" }));
    fireEvent.click(
      screen.getByRole("option", {
        name: "Population (boundary)",
        hidden: true,
      }),
    );

    const updated = onLayerChange.mock.calls[0]![0](joinedLayer);
    expect(updated.symbology.color).toMatchObject({
      normalization: {
        denominator: { type: "boundaryColumn", column: populationColumn.id },
      },
    });
  });

  it("shows labeled graduated controls and an accessible histogram", () => {
    boundarySourceState.options = [];
    render(
      <ClassificationEditor
        layer={_createLayer()}
        onLayerChange={vi.fn()}
        onBack={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Classification" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("combobox", { name: "Color mode" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("combobox", { name: "Method" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("combobox", { name: "Normalize by" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Value distribution")).toBeInTheDocument();
    expect(
      screen.getByRole("slider", { name: "Break 1 of 1, 10" }),
    ).toBeInTheDocument();
  });

  it("moves a break one bin with ArrowRight and switches to Manual", () => {
    const layer = _createLayer();
    const onLayerChange = vi.fn();
    render(
      <ClassificationEditor
        layer={layer}
        onLayerChange={onLayerChange}
        onBack={vi.fn()}
      />,
    );

    fireEvent.keyDown(screen.getByRole("slider"), { key: "ArrowRight" });
    const updated = onLayerChange.mock.calls[0]![0](layer);
    expect(updated.symbology.color).toMatchObject({
      classification: { method: "manual", breaks: [11] },
    });
  });
});
