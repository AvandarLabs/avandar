import { CONTINUITY_CATALOG } from "../../continuity/continuityCatalog";
import type { AtlasSection } from "./AtlasSections";

/** Every Atlas section, in navigation order. */
export const ATLAS_SECTIONS: readonly AtlasSection[] = [
  "motions",
  "compositions",
  "films",
  "helpers",
];

/**
 * Read deep links, including composition links authored before section routing.
 */
export function getAtlasSection(): AtlasSection {
  const parameters = new URLSearchParams(location.search);
  const entry = CONTINUITY_CATALOG.find((item) => {
    return item.id === parameters.get("film");
  });
  if (entry) {
    return entry.family === "films" ? "films" : "compositions";
  }
  const section = parameters.get("section");
  if (parameters.has("helper")) {
    return "helpers";
  }
  return (
    ATLAS_SECTIONS.find((item) => {
      return item === section;
    }) ?? "motions"
  );
}
