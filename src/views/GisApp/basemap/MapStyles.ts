import { AvaMapConfigValues } from "$/models/AvaMap/AvaMapConfig/AvaMapConfigValues";
import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";

/** Basemap style URLs, keyed by the model's basemap style union. */
export const MapStyles = {
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
} as const satisfies Record<
  AvaMapConfig.BasemapStyle,
  { url: string; name: string }
>;

/** The key of a built-in basemap style, aliased from the AvaMapConfig model. */
export type MapStyleKey = AvaMapConfig.BasemapStyle;

/** Built-in basemap keys in the order presented by map controls. */
export const MapStyleKeys: readonly MapStyleKey[] =
  AvaMapConfigValues.basemapStyleKeys;
