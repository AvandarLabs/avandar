import { createContinuityPlanFromVideoThemeSnapshot } from "../../../../src/continuity/createContinuityPlanFromVideoTheme/createContinuityPlanFromVideoTheme";
import { getPosterFrameFromPlan } from "../getPosterFrameFromPlan/getPosterFrameFromPlan";
import type { Film } from "../../../../src/showcase/showcase.types";

/**
 * The frame an Atlas card poster shows for a film, found in the plan the film
 * draws: the theme's camera preset can lengthen beats, so the authored plan's
 * poster frame would drift. A film without a plan shows its first frame.
 */
export function getPosterFrameFromFilm(
  film: Pick<Film, "id" | "plan" | "theme">,
): number {
  return film.plan
    ? getPosterFrameFromPlan(
        createContinuityPlanFromVideoThemeSnapshot(film.plan, film.theme, [
          film.id,
        ]),
      )
    : 0;
}
