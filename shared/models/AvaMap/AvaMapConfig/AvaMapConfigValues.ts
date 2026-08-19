/** Runtime values shared by map configuration types and validation. */
export const AvaMapConfigValues = {
  basemapStyleKeys: [
    "avandar",
    "positron",
    "bright",
    "liberty",
    "dark",
    "fiord",
  ] as const,
  customBasemapKinds: ["xyz", "wms", "wmts"] as const,
  annotationKinds: ["text", "arrow", "freehand", "area"] as const,
};
