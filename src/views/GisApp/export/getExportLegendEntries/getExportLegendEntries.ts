import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { ExportLegendEntry } from "@/views/GisApp/export/composeExportPdf/drawExportLegend/drawExportLegend";

import { matchLiteral } from "@avandar/utils";

/** The swatch shape that matches a layer's active symbology. */
type SwatchShape = ExportLegendEntry["swatch"]["type"];

/** Every symbology except the heatmap ramp, which is handled separately. */
type NonHeatmapSymbology = Exclude<MapLayer.Symbology, { type: "heatmap" }>;

/** The low and high endpoint labels a heatmap ramp prints, localized. */
export type HeatmapEndpointLabels = Readonly<{
  heatmapLowLabel: string;
  heatmapHighLabel: string;
}>;

/** The printed swatch shape that matches a non-heatmap symbology. */
function _getSwatchShape(symbology: NonHeatmapSymbology): SwatchShape {
  return matchLiteral(symbology.type, {
    fill: "fill",
    line: "line",
    circle: "circle",
    cluster: "circle",
    proportionalSymbol: "circle",
    heatmap: undefined,
  } as const);
}

/** The circle radius to print, matching each point symbology's own size. */
function _getSwatchRadiusPx(symbology: NonHeatmapSymbology): number {
  if (symbology.type === "circle") {
    return symbology.radius;
  }
  if (symbology.type === "cluster") {
    return symbology.radiusPx;
  }
  if (symbology.type === "proportionalSymbol") {
    return symbology.maxRadius;
  }
  return 0;
}

/** Builds one entry's swatch from its resolved color and shape. */
function _makeSwatch(options: {
  shape: SwatchShape;
  color: string;
  symbology: NonHeatmapSymbology;
}): ExportLegendEntry["swatch"] {
  const { shape, color, symbology } = options;
  if (shape === "line") {
    return { type: "line", color, isDashed: false };
  }
  if (shape === "circle") {
    return { type: "circle", color, radiusPx: _getSwatchRadiusPx(symbology) };
  }
  return { type: "fill", color };
}

/** The layer's own flat color, when its color is not value-driven. */
function _getFlatColor(symbology: NonHeatmapSymbology): string | undefined {
  return symbology.color.type === "single" ? symbology.color.color : undefined;
}

/**
 * One circle row per frozen proportional-symbol size stop, so the printed
 * legend keeps the size gradation the on-screen `SizeLegend` conveys instead
 * of collapsing every entry to the layer's largest radius.
 */
function _getSizeStopEntries(
  sizeStops: readonly MapLayer.SizeLegendStop[],
  color: string,
): ExportLegendEntry[] {
  return sizeStops.map((stop) => {
    return {
      label: stop.label,
      swatch: { type: "circle", color, radiusPx: stop.radiusPx },
    };
  });
}

/**
 * One layer's printed legend rows: its classified entries when it has any,
 * a size-stop row per frozen proportional-symbol stop, else a single
 * flat-color row, matching what `MapLegendGroup` shows on screen for the
 * same layer.
 */
function _getLayerEntries(
  layer: MapLayer.T,
  symbology: NonHeatmapSymbology,
): ExportLegendEntry[] {
  const shape = _getSwatchShape(symbology);
  const flatColor = _getFlatColor(symbology);
  if (
    symbology.type === "proportionalSymbol" &&
    layer.legend.sizeStops.length > 0 &&
    flatColor !== undefined
  ) {
    return _getSizeStopEntries(layer.legend.sizeStops, flatColor);
  }
  const entries = layer.legend.entries.filter((entry) => {
    return entry.type !== "noData" || layer.legend.showNoData;
  });
  if (entries.length === 0) {
    return flatColor === undefined
      ? []
      : [
          {
            label: layer.name,
            swatch: _makeSwatch({ shape, color: flatColor, symbology }),
          },
        ];
  }
  return entries.map((entry) => {
    return {
      label: entry.label,
      swatch: _makeSwatch({ shape, color: entry.color, symbology }),
    };
  });
}

/**
 * One fill row per color in a heatmap's ramp, so a heatmap-only map still
 * prints a legend rather than unexplained density (mirroring the on-screen
 * `HeatmapLegend`, which labels only its low and high ends). Middle ramp
 * colors carry no label, matching the screen, which has no per-stop data
 * for them either.
 */
function _getHeatmapEntries(
  ramp: readonly string[],
  labels: HeatmapEndpointLabels,
): ExportLegendEntry[] {
  const lastIndex = ramp.length - 1;
  return ramp.map((color, index) => {
    const label =
      index === 0
        ? labels.heatmapLowLabel
        : index === lastIndex
          ? labels.heatmapHighLabel
          : "";
    return { label, swatch: { type: "fill", color } };
  });
}

/**
 * Derives the PDF legend's rows from the visible layers, reusing each
 * layer's frozen `legend` config (the same data `MapLegend` renders on
 * screen) rather than recomputing colors or classes from the symbology.
 *
 * A layer whose own legend is hidden contributes no rows. A heatmap
 * contributes one row per ramp color rather than the continuous gradient
 * `HeatmapLegend` draws on screen, since a printed swatch cannot be a
 * gradient; `heatmapLowLabel` and `heatmapHighLabel` must already be
 * localized by the caller, since this function stays free of Lingui.
 */
export function getExportLegendEntries(
  options: Readonly<{
    layers: readonly MapLayer.T[];
    labels: HeatmapEndpointLabels;
  }>,
): ExportLegendEntry[] {
  const { layers, labels } = options;
  return layers.flatMap((layer) => {
    if (layer.legend.position === "hidden") {
      return [];
    }
    if (layer.symbology.type === "heatmap") {
      return _getHeatmapEntries(layer.symbology.ramp, labels);
    }
    return _getLayerEntries(layer, layer.symbology);
  });
}
