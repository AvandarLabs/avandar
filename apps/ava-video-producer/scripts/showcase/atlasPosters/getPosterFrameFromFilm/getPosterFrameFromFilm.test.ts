import assert from "node:assert/strict";
import test from "node:test";
import { ContinuityThemePlans } from "../../../../src/continuity/ContinuityThemePlans/ContinuityThemePlans";
import { ShowcaseFilms } from "../../ShowcaseFilms/ShowcaseFilms";
import { getPosterFrameFromPlan } from "../getPosterFrameFromPlan/getPosterFrameFromPlan";
import { getPosterFrameFromFilm } from "./getPosterFrameFromFilm";

test("a poster frame comes from the plan the film draws under its camera preset", async () => {
  const film = await ShowcaseFilms.load({
    id: "shared-object-handoff",
    rawOptions: {
      captions: false,
      theme: {
        id: "classic",
        patch: {
          other: { video: { semantic: { camera: { preset: "deliberate" } } } },
        },
      },
    },
  });
  const drawn = ContinuityThemePlans.fromVideoThemeSnapshot({
    plan: film.plan!,
    snapshot: film.theme,
    overrideIds: [film.id],
  });
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
