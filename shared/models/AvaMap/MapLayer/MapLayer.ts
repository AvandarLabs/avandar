/* eslint-disable @typescript-eslint/no-namespace,import-x/export */
import type {
  AreaAggregationOutputId as AreaAggregationOutputIdType,
  AreaAggregation as AreaAggregationType,
  AreaGeoBinding as AreaGeoBindingType,
  BoundarySourceRef as BoundarySourceRefType,
  GeoBindingColumnNames as GeoBindingColumnNamesType,
  GeoBinding as GeoBindingType,
  GeometryEncoding as GeometryEncodingType,
  GeometryFamily as GeometryFamilyType,
  GeometrySimplification as GeometrySimplificationType,
  PointBinding as PointBindingType,
} from "$/models/AvaMap/MapLayer/GeoBinding.types.ts";
import type {
  ClassificationConfig as ClassificationConfigType,
  ColorSpec as ColorSpecType,
  FillSymbology as FillSymbologyType,
  LayerSymbology, // prettier-ignore
  LayerValueRef as LayerValueRefType,
  NormalizationConfig as NormalizationConfigType,
} from "$/models/AvaMap/MapLayer/LayerSymbology.types.ts";
import type {
  LegendBreak as LegendBreakType,
  LegendConfig, // prettier-ignore
  LegendEntry as LegendEntryType,
} from "$/models/AvaMap/MapLayer/LegendConfig.types.ts";
import type {
  AggregateOnlyMapLayerRead,
  MapLayerId,
  MapLayerRead,
  PopupConfig,
  PopupLinkAction,
  StandardMapLayerRead,
} from "$/models/AvaMap/MapLayer/MapLayer.types.ts";
import type {
  SensitivityPolicy, // prettier-ignore
} from "$/models/AvaMap/MapLayer/SensitivityPolicy.types.ts";

/** Public model namespace for map layers, related types, and constructors. */
export {
  MapLayerModule as MapLayer, // prettier-ignore
} from "$/models/AvaMap/MapLayer/MapLayerModule/MapLayerModule.ts";

export namespace MapLayer {
  export type T = MapLayerRead;
  export type Standard = StandardMapLayerRead;
  export type AggregateOnly = AggregateOnlyMapLayerRead;
  export type Id = MapLayerId;
  export type GeoBinding = GeoBindingType;
  export type GeoBindingColumnNames = GeoBindingColumnNamesType;
  export type AreaGeoBinding = AreaGeoBindingType;
  export type PointBinding = PointBindingType;
  export type BoundarySource = BoundarySourceRefType;
  export type GeometryEncoding = GeometryEncodingType;
  export type GeometryFamily = GeometryFamilyType;
  export type GeometrySimplification = GeometrySimplificationType;
  export type AreaAggregation = AreaAggregationType;
  export type AreaAggregationOutputId = AreaAggregationOutputIdType;
  export type Symbology = LayerSymbology;
  export type FillSymbology = FillSymbologyType;
  export type Color = ColorSpecType;
  export type LayerValue = LayerValueRefType;
  export type Classification = ClassificationConfigType;
  export type Normalization = NormalizationConfigType;
  export type Sensitivity = SensitivityPolicy;
  export type Legend = LegendConfig;
  export type LegendBreak = LegendBreakType;
  export type LegendEntry = LegendEntryType;
  export type Popup = PopupConfig;
  /** A configured action link shown in a map layer popup. */
  export type PopupAction = PopupLinkAction;
}
