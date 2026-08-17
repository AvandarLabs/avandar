import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import { describe, expect, it } from "vitest";
import { MapLayerUpdates } from "@/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates";
import {
  createNumericColumn,
  createTextColumn,
} from "./MapLayerUpdates.fixtures";

describe("withSymbology", () => {
  it("carries a single color from a circle to a proportional symbol", () => {
    const column = QueryColumn.makeFromDatasetColumn(
      createNumericColumn("cases"),
    );
    const layer = MapLayerUpdates.withSymbolColor({
      layer: MapLayer.makeEmpty("Cases"),
      color: "#eb6834",
    });
    const updatedLayer = MapLayerUpdates.withSymbologyType({
      layer: layer,
      change: {
        nextType: "proportionalSymbol",
        valueColumn: column,
        remembered: undefined,
      },
    });
    expect(updatedLayer.symbology).toMatchObject({
      color: {
        type: "single",
        color: "#eb6834",
      },
    });
  });

  it("carries a single color from a circle to a cluster", () => {
    const layer = MapLayerUpdates.withSymbolColor({
      layer: MapLayer.makeEmpty("Cases"),
      color: "#eb6834",
    });

    const updatedLayer = MapLayerUpdates.withSymbologyType({
      layer,
      change: {
        nextType: "cluster",
        valueColumn: undefined,
        remembered: undefined,
      },
    });

    expect(updatedLayer.symbology).toMatchObject({
      type: "cluster",
      radiusPx: MapLayer.defaultClusterRadiusPx,
      color: { type: "single", color: "#eb6834" },
    });
  });

  it("flattens graduated color when switching to heatmap", () => {
    const valueColumn = QueryColumn.makeFromDatasetColumn(
      createNumericColumn("cases"),
    );
    const emptyLayer = MapLayer.makeEmpty("Cases");
    if (emptyLayer.symbology.type !== "circle") {
      throw new Error("Expected default circle symbology");
    }
    const layer = {
      ...emptyLayer,
      symbology: {
        ...emptyLayer.symbology,
        color: {
          type: "graduated" as const,
          value: { type: "queryColumn" as const, column: valueColumn.id },
          ramp: ["#123456", "#abcdef"],
          classification: { method: "quantile" as const, classCount: 2 },
          normalization: undefined,
          noData: { color: "#cccccc", label: "" },
        },
      },
    };

    const clusterLayer = MapLayerUpdates.withSymbologyType({
      layer,
      change: {
        nextType: "cluster",
        valueColumn: undefined,
        remembered: undefined,
      },
    });
    const heatmapLayer = MapLayerUpdates.withSymbologyType({
      layer,
      change: {
        nextType: "heatmap",
        valueColumn: undefined,
        remembered: undefined,
      },
    });

    expect(clusterLayer.symbology).toMatchObject({
      type: "cluster",
      color: { type: "single", color: "#123456" },
    });
    expect(heatmapLayer.symbology).toEqual({
      type: "heatmap",
      radiusPx: MapLayer.defaultHeatmapRadiusPx,
      weight: undefined,
      ramp: MapLayer.defaultHeatmapRamp,
    });
  });

  it.each([
    {
      categories: [{ value: "a", color: "#654321", label: "A" }],
      expectedColor: "#654321",
    },
    { categories: [], expectedColor: MapLayer.defaultSymbolColor },
  ])(
    "flattens categorical color when switching to cluster",
    ({ categories, expectedColor }) => {
      const valueColumn = QueryColumn.makeFromDatasetColumn(
        createNumericColumn("category"),
      );
      const emptyLayer = MapLayer.makeEmpty("Cases");
      if (emptyLayer.symbology.type !== "circle") {
        throw new Error("Expected default circle symbology");
      }
      const layer = {
        ...emptyLayer,
        symbology: {
          ...emptyLayer.symbology,
          color: {
            type: "categorical" as const,
            value: { type: "queryColumn" as const, column: valueColumn.id },
            categories,
            other: { color: "#999999", label: "Other" },
            noData: { color: "#cccccc", label: "No data" },
          },
        },
      };

      const updatedLayer = MapLayerUpdates.withSymbologyType({
        layer,
        change: {
          nextType: "cluster",
          valueColumn: undefined,
          remembered: undefined,
        },
      });

      expect(updatedLayer.symbology).toMatchObject({
        type: "cluster",
        color: { type: "single", color: expectedColor },
      });
    },
  );

  it("updates cluster and heatmap authoring settings", () => {
    const weightColumn = QueryColumn.makeFromDatasetColumn(
      createNumericColumn("population"),
    );
    const clusterLayer = MapLayerUpdates.withSymbologyType({
      layer: MapLayer.makeEmpty("Cases"),
      change: {
        nextType: "cluster",
        valueColumn: undefined,
        remembered: undefined,
      },
    });
    const withClusterRadius = MapLayerUpdates.withClusterRadius({
      layer: clusterLayer,
      radiusPx: 64,
    });
    const heatmapLayer = MapLayerUpdates.withSymbologyType({
      layer: withClusterRadius,
      change: {
        nextType: "heatmap",
        valueColumn: undefined,
        remembered: undefined,
      },
    });
    const withWeight = MapLayerUpdates.withHeatmapWeight({
      layer: heatmapLayer,
      column: weightColumn,
    });
    const withRadius = MapLayerUpdates.withHeatmapRadius({
      layer: withWeight,
      radiusPx: 42,
    });
    const updatedLayer = MapLayerUpdates.withHeatmapRamp({
      layer: withRadius,
      ramp: ["#000000", "#ffffff"],
    });

    expect(withClusterRadius.symbology).toMatchObject({ radiusPx: 64 });
    expect(updatedLayer.source.queryColumns).toContain(weightColumn);
    expect(updatedLayer.symbology).toEqual({
      type: "heatmap",
      radiusPx: 42,
      weight: weightColumn.id,
      ramp: ["#000000", "#ffffff"],
    });
  });

  it("rejects a non-numeric heatmap weight column", () => {
    const heatmapLayer = MapLayerUpdates.withSymbologyType({
      layer: MapLayer.makeEmpty("Cases"),
      change: {
        nextType: "heatmap",
        valueColumn: undefined,
        remembered: undefined,
      },
    });
    const textColumn = QueryColumn.makeFromDatasetColumn(
      createTextColumn("category"),
    );

    const updatedLayer = MapLayerUpdates.withHeatmapWeight({
      layer: heatmapLayer,
      column: textColumn,
    });

    expect(updatedLayer).toBe(heatmapLayer);
    expect(updatedLayer.source.queryColumns).not.toContain(textColumn);
  });

  it("maps a circle's radius onto the proportional symbol's largest radius", () => {
    const layer = MapLayerUpdates.withCircleRadius({
      layer: MapLayer.makeEmpty("Cases"),
      radius: 11,
    });
    const updatedLayer = MapLayerUpdates.withSymbologyType({
      layer: layer,
      change: {
        nextType: "proportionalSymbol",
        valueColumn: QueryColumn.makeFromDatasetColumn(
          createNumericColumn("cases"),
        ),
        remembered: undefined,
      },
    });
    expect(
      updatedLayer.symbology.type === "proportionalSymbol" &&
        updatedLayer.symbology.maxRadius,
    ).toBe(11);
  });

  it("restores a remembered symbology of the target type", () => {
    const layer = MapLayer.makeEmpty("Cases");
    const remembered = {
      type: "circle" as const,
      radius: 3,
      color: { type: "single" as const, color: "#008300" },
      stroke: { width: 2, color: "#ffffff" },
    };
    const updatedLayer = MapLayerUpdates.withSymbologyType({
      layer: layer,
      change: {
        nextType: "circle",
        valueColumn: undefined,
        remembered,
      },
    });
    expect(updatedLayer.symbology).toEqual(remembered);
  });

  it("sets minimum radius and linear scale on a sized layer", () => {
    const column = QueryColumn.makeFromDatasetColumn(
      createNumericColumn("cases"),
    );
    const sizedLayer = MapLayerUpdates.withSymbologyType({
      layer: MapLayer.makeEmpty("Cases"),
      change: {
        nextType: "proportionalSymbol",
        valueColumn: column,
        remembered: undefined,
      },
    });

    const withRadius = MapLayerUpdates.withMinSymbolRadius({
      layer: sizedLayer,
      minRadius: 6,
    });
    const updated = MapLayerUpdates.withSymbolScale({
      layer: withRadius,
      scale: "linear",
    });

    expect(
      updated.symbology.type === "proportionalSymbol" &&
        updated.symbology.minRadius,
    ).toBe(6);
    expect(
      updated.symbology.type === "proportionalSymbol" &&
        updated.symbology.scale,
    ).toBe("linear");
  });

  it("keeps sized settings when changing the value column", () => {
    const firstColumn = QueryColumn.makeFromDatasetColumn(
      createNumericColumn("cases"),
    );
    const secondColumn = QueryColumn.makeFromDatasetColumn(
      createNumericColumn("population"),
    );
    const sizedLayer = MapLayerUpdates.withSymbolScale({
      layer: MapLayerUpdates.withMinSymbolRadius({
        layer: MapLayerUpdates.withSymbologyType({
          layer: MapLayer.makeEmpty("Cases"),
          change: {
            nextType: "proportionalSymbol",
            valueColumn: firstColumn,
            remembered: undefined,
          },
        }),
        minRadius: 7,
      }),
      scale: "linear",
    });

    const updated = MapLayerUpdates.withSymbolSizeColumn({
      layer: sizedLayer,
      column: secondColumn,
    });

    expect(updated.symbology).toMatchObject({
      type: "proportionalSymbol",
      value: secondColumn.id,
      minRadius: 7,
      scale: "linear",
    });
  });

  it("does not apply sized settings to a flat circle", () => {
    const layer = MapLayer.makeEmpty("Cases");

    expect(MapLayerUpdates.withMinSymbolRadius({ layer, minRadius: 6 })).toBe(
      layer,
    );
    expect(MapLayerUpdates.withSymbolScale({ layer, scale: "linear" })).toBe(
      layer,
    );
  });
});
