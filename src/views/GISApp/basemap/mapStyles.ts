import { registry } from "@utils";
import type { AvaMap } from "$/models/AvaMap/AvaMap";

/** Basemap style URLs, keyed by the model's basemap style union. */
export const mapStyles = {
  positron: {
    url: "https://tiles.openfreemap.org/styles/positron",
    name: "Positron",
  },
  bright: {
    url: "https://tiles.openfreemap.org/styles/bright",
    name: "Bright",
  },
  liberty: {
    url: "https://tiles.openfreemap.org/styles/liberty",
    name: "Liberty",
  },
  dark: {
    url: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
    name: "Dark",
  },
  fiord: {
    url: "https://tiles.openfreemap.org/styles/fiord",
    name: "Fiord",
  },
  avandar: {
    url: "https://tiles.openfreemap.org/styles/bright",
    name: "Avandar",
  },
} as const satisfies Record<AvaMap.BasemapStyle, { url: string; name: string }>;

export type MapStyleKey = AvaMap.BasemapStyle;

export const MapStyleKeys = registry<MapStyleKey>().keys(
  "avandar",
  "positron",
  "bright",
  "liberty",
  "dark",
  "fiord",
);
