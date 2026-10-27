import { ChoroplethClassBreaks } from "../../presets/ChoroplethClassBreaks/ChoroplethClassBreaks";
import { CoordinateFrameRegistration } from "../../presets/CoordinateFrameRegistration/CoordinateFrameRegistration";
import { CoordinateQualityTriage } from "../../presets/CoordinateQualityTriage/CoordinateQualityTriage";
import { DistanceBufferEnvelope } from "../../presets/DistanceBufferEnvelope/DistanceBufferEnvelope";
import { GeometryDetailBudget } from "../../presets/GeometryDetailBudget/GeometryDetailBudget";
import { KernelDensitySpread } from "../../presets/KernelDensitySpread/KernelDensitySpread";
import { MapClusterUnfold } from "../../presets/MapClusterUnfold/MapClusterUnfold";
import { ProportionalSymbolArea } from "../../presets/ProportionalSymbolArea/ProportionalSymbolArea";
import { SpatialGridBinning } from "../../presets/SpatialGridBinning/SpatialGridBinning";
import { makeStockRendererFromComponent } from "./makeStockRendererFromComponent";
/** Typed renderers for geographic classification, aggregation, and geometry. */
export const geospatialStockRenderers = {
  "choropleth-class-breaks": makeStockRendererFromComponent({
    preset: "choropleth-class-breaks",
    Renderer: ChoroplethClassBreaks,
  }),
  "proportional-symbol-area": makeStockRendererFromComponent({
    preset: "proportional-symbol-area",
    Renderer: ProportionalSymbolArea,
  }),
  "map-cluster-unfold": makeStockRendererFromComponent({
    preset: "map-cluster-unfold",
    Renderer: MapClusterUnfold,
  }),
  "spatial-grid-binning": makeStockRendererFromComponent({
    preset: "spatial-grid-binning",
    Renderer: SpatialGridBinning,
  }),
  "coordinate-quality-triage": makeStockRendererFromComponent({
    preset: "coordinate-quality-triage",
    Renderer: CoordinateQualityTriage,
  }),
  "coordinate-frame-registration": makeStockRendererFromComponent({
    preset: "coordinate-frame-registration",
    Renderer: CoordinateFrameRegistration,
  }),
  "geometry-detail-budget": makeStockRendererFromComponent({
    preset: "geometry-detail-budget",
    Renderer: GeometryDetailBudget,
  }),
  "kernel-density-spread": makeStockRendererFromComponent({
    preset: "kernel-density-spread",
    Renderer: KernelDensitySpread,
  }),
  "distance-buffer-envelope": makeStockRendererFromComponent({
    preset: "distance-buffer-envelope",
    Renderer: DistanceBufferEnvelope,
  }),
} satisfies Record<string, ReturnType<typeof makeStockRendererFromComponent>>;
