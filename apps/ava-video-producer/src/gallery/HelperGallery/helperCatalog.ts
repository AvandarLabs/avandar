import catalog from "./helperCatalog.yaml";
import { parseHelperCatalog } from "./parseHelperCatalog/parseHelperCatalog";
import type { HelperCatalog, HelperEntry } from "./helperCatalog.types";

/** The validated helper catalog shared by the gallery and the live player. */
export const HELPER_CATALOG: HelperCatalog = parseHelperCatalog(catalog);

/** The canvas every helper preview renders at, live and as a thumbnail. */
export const HELPER_CANVAS = { width: 960, height: 600 } as const;

/** Live player film id prefix for a helper preview. */
export const HELPER_FILM_PREFIX = "helper-";

/** The live player film id that previews `helper`. */
export function buildHelperFilmId(helper: Pick<HelperEntry, "id">): string {
  return `${HELPER_FILM_PREFIX}${helper.id}`;
}

/** The catalogued helper a live player film id names, if any. */
export function getHelperFromFilmId(filmId: string): HelperEntry | undefined {
  if (!filmId.startsWith(HELPER_FILM_PREFIX)) {
    return undefined;
  }
  const id = filmId.slice(HELPER_FILM_PREFIX.length);
  return HELPER_CATALOG.helpers.find((helper) => {
    return helper.id === id;
  });
}
