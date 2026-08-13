/* eslint-disable @typescript-eslint/no-namespace,import-x/export */
import type {
  MapLayerId,
  MapLayerRead,
} from "$/models/AvaMap/MapLayer/MapLayer.types.ts";

export { MapLayerModule as MapLayer } from "$/models/AvaMap/MapLayer/MapLayerModule.ts";

export namespace MapLayer {
  export type T = MapLayerRead;
  export type Id = MapLayerId;
}
