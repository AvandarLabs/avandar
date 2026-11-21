import { propEq } from "@avandar/utils";
import { CONTINUITY_CATALOG } from "../../continuity/isSceneEntry";
import {
  AtlasSectionNames,
  type AtlasSectionName,
} from "./AtlasSections/AtlasSectionNames";
/**
 * Read deep links, including composition links authored before section routing.
 */
export function getAtlasSection(): AtlasSectionName {
  const parameters = new URLSearchParams(location.search);
  const filmId = parameters.get("film");
  const entry =
    filmId === null ? undefined : CONTINUITY_CATALOG.find(propEq("id", filmId));
  if (entry) {
    return entry.family === "films" ? "films" : "compositions";
  }
  const section = parameters.get("section");
  return parameters.has("helper")
    ? "helpers"
    : AtlasSectionNames.isValid(section)
      ? section
      : "motions";
}
