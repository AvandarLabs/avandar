/* eslint-disable @typescript-eslint/no-namespace,import-x/export */
import type {
  AvaMapId,
  AvaMapRead,
  BasemapConfig,
  BasemapStyleKey,
  MapViewState,
} from "$/models/AvaMap/AvaMap.types.ts";

/** Public model namespace for saved map configuration and constructors. */
export { AvaMapModule as AvaMap } from "$/models/AvaMap/AvaMapModule/AvaMapModule.ts";

export namespace AvaMap {
  export type T = AvaMapRead;
  export type Id = AvaMapId;
  export type Basemap = BasemapConfig;
  export type BasemapStyle = BasemapStyleKey;
  export type ViewState = MapViewState;
}
