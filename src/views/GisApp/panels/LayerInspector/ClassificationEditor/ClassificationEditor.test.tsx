import { Model } from "@avandar/models";
import { describe, expect, it, vi } from "vitest";
import { uuid } from "$/lib/uuid";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import { fireEvent, render, screen, within } from "@/test-utils";
import { getMantineSelectDropdown } from "@/test-utils/pickMantineSelectOption";
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
      ...MapLayer.createDefaultFillSymbology(),
      color: {
        type: "graduated",
        value: { type: "queryColumn", column: column.id },
        ramp: ["#eff3ff", "#bdd7e7", "#6baed6", "#2171b5", "#08306b"],
        classLabels: [undefined, undefined, undefined, undefined, undefined],
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

type GraduatedColor = Extract<MapLayer.Color, { type: "graduated" }>;

function _createColumn(
  name: string,
  dataType: "double" | "varchar",
): QueryColumn.T {
  const now = new Date().toISOString();
  return QueryColumn.makeFromDatasetColumn(
    Model.make("DatasetColumn", {
      id: uuid<DatasetColumn.Id>(),
      datasetId: uuid<Dataset.Id>(),
      workspaceId: uuid<Workspace.Id>(),
      createdAt: now,
      updatedAt: now,
      name,
      originalName: name,
      originalDataType: dataType === "double" ? "DOUBLE" : "VARCHAR",
      dataType,
      detectedDataType: dataType === "double" ? "DOUBLE" : "VARCHAR",
      description: undefined,
      columnIdx: 0,
    }),
  );
}

function _withSourceColumns(options: {
  queryColumns: QueryColumn.T[];
  sourceColumns: QueryColumn.T[];
}): MapLayer.T {
  const layer = MapLayer.makeEmpty("Schools");
  return {
    ...layer,
    source: {
      ...layer.source,
      queryColumns: options.queryColumns,
      sourceColumns: options.sourceColumns,
    },
  };
}

function _withGraduatedColor(
  layer: MapLayer.T,
  overrides: Partial<GraduatedColor>,
): MapLayer.T {
  if (
    layer.symbology.type !== "fill" ||
    layer.symbology.color.type !== "graduated"
  ) {
    throw new Error("Expected a graduated fill layer");
  }
  return {
    ...layer,
    symbology: {
      ...layer.symbology,
      color: { ...layer.symbology.color, ...overrides },
    },
  };
}

describe("ClassificationEditor", () => {
  it("names a reversed preset in the color ramp select", () => {
    boundarySourceState.options = [];
    const layer = _withGraduatedColor(_createLayer(), {
      ramp: ["#08306b", "#2171b5", "#6baed6", "#bdd7e7", "#eff3ff"],
    });
    render(
      <ClassificationEditor
        layer={layer}
        onLayerChange={vi.fn()}
        onBack={vi.fn()}
      />,
    );

    expect(screen.getByRole("combobox", { name: "Color ramp" })).toHaveValue(
      "Blue",
    );
  });

  it("shows custom colors when the ramp matches no preset", () => {
    boundarySourceState.options = [];
    const layer = _withGraduatedColor(_createLayer(), {
      ramp: ["#d7301f", "#bdd7e7", "#6baed6", "#2171b5", "#08306b"],
    });
    render(
      <ClassificationEditor
        layer={layer}
        onLayerChange={vi.fn()}
        onBack={vi.fn()}
      />,
    );

    const rampSelect = screen.getByRole("combobox", { name: "Color ramp" });
    expect(rampSelect).toHaveValue("");
    expect(rampSelect).toHaveAttribute("placeholder", "Custom colors");
  });

  it("fills every class from the picked red preset", () => {
    boundarySourceState.options = [];
    const layer = _createLayer();
    const onLayerChange = vi.fn();
    render(
      <ClassificationEditor
        layer={layer}
        onLayerChange={onLayerChange}
        onBack={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("combobox", { name: "Color ramp" }));
    fireEvent.click(screen.getByRole("option", { name: "Red", hidden: true }));

    const updated = onLayerChange.mock.calls[0]![0](layer);
    expect(updated.symbology.color.ramp).toEqual([
      "#fee5d9",
      "#fcae91",
      "#fb6a4a",
      "#de2d26",
      "#a50f15",
    ]);
  });

  it("reverses the class colors from the Reverse colors button", () => {
    boundarySourceState.options = [];
    const layer = _createLayer();
    const onLayerChange = vi.fn();
    render(
      <ClassificationEditor
        layer={layer}
        onLayerChange={onLayerChange}
        onBack={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Reverse colors" }));

    const updated = onLayerChange.mock.calls[0]![0](layer);
    expect(updated.symbology.color.ramp).toEqual([
      "#08306b",
      "#2171b5",
      "#6baed6",
      "#bdd7e7",
      "#eff3ff",
    ]);
  });

  it("uses the grid aggregation output when enabling graduated color", () => {
    const layer = _createLayer();
    const outputValueId = uuid<MapLayer.AreaAggregationOutputId>();
    const gridLayer: MapLayer.T = {
      ...layer,
      geoBinding: {
        type: "binPointsToGrid",
        grid: "hex",
        sizeMeters: 10_000,
        points: {
          type: "geometryColumn",
          column: layer.source.queryColumns[0]!.id,
          encoding: "wkt",
          family: "point",
          simplification: undefined,
          sourceCrs: undefined,
        },
        aggregation: { operation: "count", outputValueId },
      },
      symbology: {
        ...MapLayer.createDefaultFillSymbology(),
        color: { type: "single", color: "#228be6" },
      },
    };
    const onLayerChange = vi.fn();
    render(
      <ClassificationEditor
        layer={gridLayer}
        onLayerChange={onLayerChange}
        onBack={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("combobox", { name: "Color mode" }));
    fireEvent.click(
      screen.getByRole("option", { name: "Graduated", hidden: true }),
    );

    const updated = onLayerChange.mock.calls[0]![0](gridLayer);
    expect(updated.symbology.color).toMatchObject({
      type: "graduated",
      value: { type: "areaAggregation", outputValueId },
    });
  });

  it("offers query columns but not boundary columns for grid bins", () => {
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
    const gridLayer: MapLayer.T = {
      ...layer,
      geoBinding: {
        type: "binPointsToGrid",
        grid: "hex",
        sizeMeters: 10_000,
        points: {
          type: "geometryColumn",
          column: layer.source.queryColumns[0]!.id,
          encoding: "wkt",
          family: "point",
          simplification: undefined,
          sourceCrs: undefined,
        },
        aggregation: {
          operation: "count",
          outputValueId: uuid<MapLayer.AreaAggregationOutputId>(),
        },
      },
    };
    render(
      <ClassificationEditor
        layer={gridLayer}
        onLayerChange={vi.fn()}
        onBack={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("combobox", { name: "Normalize by" }));
    const dropdown = getMantineSelectDropdown("Normalize by");

    expect(
      within(dropdown).getByRole("option", { name: "Cases", hidden: true }),
    ).toBeInTheDocument();
    expect(
      within(dropdown).queryByRole("option", {
        name: "Population (boundary)",
        hidden: true,
      }),
    ).not.toBeInTheDocument();
  });

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

  it("shows one label input per class", () => {
    boundarySourceState.options = [];
    render(
      <ClassificationEditor
        layer={_createLayer()}
        onLayerChange={vi.fn()}
        onBack={vi.fn()}
      />,
    );

    expect(
      screen.getAllByRole("textbox", { name: /^Class \d label$/ }),
    ).toHaveLength(5);
  });

  it("shows the generated interval as a class label placeholder", () => {
    boundarySourceState.options = [];
    render(
      <ClassificationEditor
        layer={_createLayer()}
        onLayerChange={vi.fn()}
        onBack={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("textbox", { name: "Class 1 label" }),
    ).toHaveAttribute("placeholder", "< 10");
  });

  it("writes a typed label to its class", () => {
    boundarySourceState.options = [];
    const layer = _createLayer();
    const onLayerChange = vi.fn();
    render(
      <ClassificationEditor
        layer={layer}
        onLayerChange={onLayerChange}
        onBack={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByRole("textbox", { name: "Class 2 label" }), {
      target: { value: "95% or above" },
    });

    const updated = onLayerChange.mock.calls[0]![0](layer);
    expect(updated.symbology.color.classLabels).toEqual([
      undefined,
      "95% or above",
      undefined,
      undefined,
      undefined,
    ]);
  });

  it("writes a picked swatch color to its class", async () => {
    boundarySourceState.options = [];
    const layer = _createLayer();
    const onLayerChange = vi.fn();
    render(
      <ClassificationEditor
        layer={layer}
        onLayerChange={onLayerChange}
        onBack={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Class 1 color" }));
    fireEvent.click(await screen.findByRole("button", { name: "#d7301f" }));

    const updated = onLayerChange.mock.calls.at(-1)![0](layer);
    expect(updated.symbology.color.ramp).toEqual([
      "#d7301f",
      "#bdd7e7",
      "#6baed6",
      "#2171b5",
      "#08306b",
    ]);
  });

  it("stores a typed percent as a fraction when every value is a fraction", () => {
    boundarySourceState.options = [];
    const layer = _createLayer();
    const onLayerChange = vi.fn();
    render(
      <ClassificationEditor
        layer={layer}
        classifiedValueDomain={[0.62, 1]}
        onLayerChange={onLayerChange}
        onBack={vi.fn()}
      />,
    );

    fireEvent.change(
      screen.getByRole("textbox", { name: "Highlight values below" }),
      { target: { value: "95" } },
    );

    const updated = onLayerChange.mock.calls.at(-1)![0](layer);
    expect(updated.symbology.color).toMatchObject({
      classification: { method: "manual", breaks: [0.95] },
      ramp: ["#d7301f", "#d9d9d9"],
      classLabels: ["Below 95%", "95% or above"],
    });
  });

  it("stores a typed percent without float drift", () => {
    boundarySourceState.options = [];
    const layer = _createLayer();
    const onLayerChange = vi.fn();
    render(
      <ClassificationEditor
        layer={layer}
        classifiedValueDomain={[0.1, 1]}
        onLayerChange={onLayerChange}
        onBack={vi.fn()}
      />,
    );

    fireEvent.change(
      screen.getByRole("textbox", { name: "Highlight values below" }),
      { target: { value: "33.3" } },
    );

    const updated = onLayerChange.mock.calls.at(-1)![0](layer);
    expect(updated.symbology.color.classification.breaks).toEqual([0.333]);
  });

  it("stores the typed number as is when values are not fractions", () => {
    boundarySourceState.options = [];
    const layer = _createLayer();
    const onLayerChange = vi.fn();
    render(
      <ClassificationEditor
        layer={layer}
        classifiedValueDomain={[3, 410]}
        onLayerChange={onLayerChange}
        onBack={vi.fn()}
      />,
    );

    fireEvent.change(
      screen.getByRole("textbox", { name: "Highlight values below" }),
      { target: { value: "100" } },
    );

    const updated = onLayerChange.mock.calls.at(-1)![0](layer);
    expect(updated.symbology.color).toMatchObject({
      classification: { method: "manual", breaks: [100] },
      classLabels: ["Below 100", "100 or above"],
    });
  });

  it("enables graduated color from a numeric source column that is not queried yet", () => {
    const geometry = _createColumn("coordinates", "varchar");
    const measles = _createColumn("percentimmunizedmeasles", "double");
    const layer = _withSourceColumns({
      queryColumns: [geometry],
      sourceColumns: [geometry, measles],
    });
    const onLayerChange = vi.fn();
    render(
      <ClassificationEditor
        layer={layer}
        onLayerChange={onLayerChange}
        onBack={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("combobox", { name: "Color mode" }));
    fireEvent.click(
      screen.getByRole("option", { name: "Graduated", hidden: true }),
    );

    const updated = onLayerChange.mock.calls[0]![0](layer);
    expect(updated.symbology.color).toMatchObject({
      type: "graduated",
      value: { type: "queryColumn", column: measles.id },
    });
    expect(
      updated.source.queryColumns.map((column) => {
        return column.id;
      }),
    ).toContain(measles.id);
  });

  it("changes the graduated measure to another numeric source column", () => {
    const geometry = _createColumn("coordinates", "varchar");
    const exemptions = _createColumn("percentmedicalexemptions", "double");
    const measles = _createColumn("percentimmunizedmeasles", "double");
    const schools = _withSourceColumns({
      queryColumns: [geometry],
      sourceColumns: [geometry, exemptions, measles],
    });
    if (schools.symbology.type !== "circle") {
      throw new Error("Expected a circle layer");
    }
    const layer: MapLayer.T = {
      ...schools,
      symbology: {
        ...schools.symbology,
        color: {
          type: "graduated",
          value: { type: "queryColumn", column: exemptions.id },
          ramp: ["#eff3ff", "#bdd7e7", "#6baed6", "#2171b5", "#08306b"],
          classLabels: [undefined, undefined, undefined, undefined, undefined],
          classification: { method: "quantile", classCount: 5 },
          normalization: undefined,
          noData: { color: "#ced4da", label: "" },
        },
      },
    };
    const onLayerChange = vi.fn();
    render(
      <ClassificationEditor
        layer={layer}
        onLayerChange={onLayerChange}
        onBack={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("combobox", { name: "Measure" }));
    fireEvent.click(
      screen.getByRole("option", {
        name: "percentimmunizedmeasles",
        hidden: true,
      }),
    );

    const updated = onLayerChange.mock.calls[0]![0](layer);
    expect(updated.symbology.color.value).toEqual({
      type: "queryColumn",
      column: measles.id,
    });
    expect(
      updated.source.queryColumns.map((column) => {
        return column.id;
      }),
    ).toContain(measles.id);
  });
});
