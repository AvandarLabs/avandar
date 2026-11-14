import assert from "node:assert/strict";
import test from "node:test";
import { createContinuityPlanFromVideoThemeSnapshot } from "../../../../src/continuity/createContinuityPlanFromVideoTheme/createContinuityPlanFromVideoTheme";
import { ShowcaseFilms } from "../../ShowcaseFilms/ShowcaseFilms";
import { getPosterFrameFromPlan } from "../getPosterFrameFromPlan/getPosterFrameFromPlan";
import { getPosterFrameFromFilm } from "./getPosterFrameFromFilm";

test("a poster frame comes from the plan the film draws under its camera preset", async () => {
  const film = await ShowcaseFilms.load("shared-object-handoff", {
    captions: false,
    theme: {
      id: "classic",
      patch: {
        other: { video: { semantic: { camera: { preset: "deliberate" } } } },
      },
    },
  });
  const drawn = createContinuityPlanFromVideoThemeSnapshot(
    film.plan!,
    film.theme,
    [film.id],
  );
  const frame = getPosterFrameFromFilm(film);
  assert.equal(frame, getPosterFrameFromPlan(drawn));
  // The deliberate preset lengthens beats, so the authored plan would drift.
  assert.notEqual(frame, getPosterFrameFromPlan(film.plan!));
});

test("a film without a plan shows its first frame", () => {
  assert.equal(
    getPosterFrameFromFilm({
      id: "no-plan",
      plan: undefined,
      theme: undefined,
    }),
    0,
  );
});
