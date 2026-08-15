/* eslint-disable @typescript-eslint/no-namespace,import-x/export */
import type {
  GeoBindingColumnNames as GeoBindingColumnNamesType,
  GeoBinding as GeoBindingType,
} from "$/models/AvaMap/MapLayer/GeoBinding.types.ts";
import type {
  LayerSymbology, // prettier-ignore
} from "$/models/AvaMap/MapLayer/LayerSymbology.types.ts";
import type {
  LegendConfig, // prettier-ignore
} from "$/models/AvaMap/MapLayer/LegendConfig.types.ts";
import type {
  MapLayerId,
  MapLayerRead,
  PopupConfig,
  PopupLinkAction,
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
  export type Id = MapLayerId;
  export type GeoBinding = GeoBindingType;
  export type GeoBindingColumnNames = GeoBindingColumnNamesType;
  export type Symbology = LayerSymbology;
  export type Sensitivity = SensitivityPolicy;
  export type Legend = LegendConfig;
  export type Popup = PopupConfig;
  /** A configured action link shown in a map layer popup. */
  export type PopupAction = PopupLinkAction;
}
