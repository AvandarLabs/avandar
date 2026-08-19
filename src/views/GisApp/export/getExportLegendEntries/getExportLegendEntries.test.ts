import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { describe, expect, it } from "vitest";
import { getExportLegendEntries } from "@/views/GisApp/export/getExportLegendEntries/getExportLegendEntries";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";

const HEATMAP_LABELS = { heatmapLowLabel: "Low", heatmapHighLabel: "High" };

/**
 * A fill layer whose legend has no classified entries.
 *
 * Typed as `MapLayer.Standard` rather than the wider `MapLayer.T` union: a
 * spread of the union type would merge both `sensitivity` branches together,
 * making every override below fail to match either branch.
 */
function _flatLayer(): MapLayer.Standard {
  return MapLayer.createArea("Health zones");
}

describe("getExportLegendEntries", () => {
  it("contributes nothing for a layer whose legend is hidden", () => {
    const layer = {
      ..._flatLayer(),
      legend: { ..._flatLayer().legend, position: "hidden" },
    } satisfies MapLayer.T;

    expect(
      getExportLegendEntries({ layers: [layer], labels: HEATMAP_LABELS }),
    ).toEqual([]);
  });

  it("produces one row per classified entry", () => {
    const layer = {
      ..._flatLayer(),
      legend: {
        ..._flatLayer().legend,
        entries: [
          { type: "value", color: "#111111", label: "High", count: 5 },
          { type: "value", color: "#222222", label: "Low", count: 3 },
        ],
      },
    } satisfies MapLayer.T;

    expect(
      getExportLegendEntries({ layers: [layer], labels: HEATMAP_LABELS }),
    ).toEqual([
      { label: "High", swatch: { type: "fill", color: "#111111" } },
      { label: "Low", swatch: { type: "fill", color: "#222222" } },
    ]);
  });

  it("drops the no-data row when showNoData is false", () => {
    const layer = {
      ..._flatLayer(),
      legend: {
        ..._flatLayer().legend,
        showNoData: false,
        entries: [
          { type: "value", color: "#111111", label: "High", count: 5 },
          { type: "noData", color: "#cccccc", label: "Not reported", count: 2 },
        ],
      },
    } satisfies MapLayer.T;

    expect(
      getExportLegendEntries({ layers: [layer], labels: HEATMAP_LABELS }),
    ).toEqual([{ label: "High", swatch: { type: "fill", color: "#111111" } }]);
  });

  it("prints one flat row labelled with the layer name when there are no entries", () => {
    const layer = {
      ..._flatLayer(),
      name: "Health zones",
      symbology: {
        type: "fill",
        color: { type: "single", color: "#336699" },
        stroke: { width: 1, color: "#000000" },
        opacity: 1,
      },
    } satisfies MapLayer.T;

    expect(
      getExportLegendEntries({ layers: [layer], labels: HEATMAP_LABELS }),
    ).toEqual([
      { label: "Health zones", swatch: { type: "fill", color: "#336699" } },
    ]);
  });

  it("prints one circle row per size stop for a proportional symbol layer", () => {
    const layer = {
      ..._flatLayer(),
      symbology: {
        type: "proportionalSymbol",
        value: "col" as QueryColumn.Id,
        minRadius: 4,
        maxRadius: 20,
        scale: "sqrt",
        color: { type: "single", color: "#996600" },
        stroke: { width: 1, color: "#000000" },
      },
      legend: {
        ..._flatLayer().legend,
        sizeStops: [
          { value: 10, radiusPx: 6, label: "10 cases" },
          { value: 100, radiusPx: 14, label: "100 cases" },
          { value: 500, radiusPx: 20, label: "500 cases" },
        ],
      },
    } satisfies MapLayer.T;

    expect(
      getExportLegendEntries({ layers: [layer], labels: HEATMAP_LABELS }),
    ).toEqual([
      {
        label: "10 cases",
        swatch: { type: "circle", color: "#996600", radiusPx: 6 },
      },
      {
        label: "100 cases",
        swatch: { type: "circle", color: "#996600", radiusPx: 14 },
      },
      {
        label: "500 cases",
        swatch: { type: "circle", color: "#996600", radiusPx: 20 },
      },
    ]);
  });

  it("prints one fill row per ramp color for a heatmap, labelling only the endpoints", () => {
    const layer = {
      ..._flatLayer(),
      symbology: {
        type: "heatmap",
        radiusPx: 20,
        weight: undefined,
        ramp: ["#000033", "#0000ff", "#ff0000", "#ffff00"],
      },
    } satisfies MapLayer.T;

    expect(
      getExportLegendEntries({ layers: [layer], labels: HEATMAP_LABELS }),
    ).toEqual([
      { label: "Low", swatch: { type: "fill", color: "#000033" } },
      { label: "", swatch: { type: "fill", color: "#0000ff" } },
      { label: "", swatch: { type: "fill", color: "#ff0000" } },
      { label: "High", swatch: { type: "fill", color: "#ffff00" } },
    ]);
  });
});
