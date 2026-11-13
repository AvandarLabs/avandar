import { resolveVideoThemeFromSnapshot } from "../../../src/videoTheme/videoThemeSnapshot/videoThemeSnapshot";
import type { Film } from "../../../src/showcase/showcase.types";

/**
 * The theme an export rendered, for its `delivery.json`: the theme id and
 * the resolved hash, which matches the hash the live player acknowledged
 * for the same draft.
 */
export function getDeliveryThemeFromFilm(
  film: Pick<Film, "id" | "theme">,
): Readonly<{ themeId: string; themeHash: string }> {
  return {
    themeId: film.theme?.themeId ?? "classic",
    themeHash: resolveVideoThemeFromSnapshot(film.theme, [film.id]).hash,
  };
}
