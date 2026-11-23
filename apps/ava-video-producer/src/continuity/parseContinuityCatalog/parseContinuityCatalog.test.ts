import assert from "node:assert/strict";
import test from "node:test";
import { parseContinuityCatalog } from "./parseContinuityCatalog";

const FILM = {
  id: "source-film",
  title: "The source film",
  category: "motion-motion",
  description: "A complete explanation.",
  frames: 300,
  path: "explainers/source-film",
  family: "films",
};
const STUDY = {
  id: "identity-study",
  title: "The identity study",
  category: "transitions",
  description: "Keep one object recognizable.",
  frames: 120,
  path: "explainers/identity-study",
  family: "vocabulary",
  sourceFilm: "source-film",
  goodFor: "Moving an identified object.",
  tags: ["shared object", "continuity"],
  creativeDirection: "Hold the object's label: move only its position.",
  avoid: "Unrelated objects.",
  controls: [{ path: "token.label", label: "Label", description: "Name it." }],
};
test("preserves authored film and study metadata without rewriting prose", () => {
  assert.deepEqual(
    parseContinuityCatalog({
      films: [FILM],
      studies: [STUDY],
    }),
    [FILM, STUDY],
  );
});
test("rejects nonnumeric frame counts in authored metadata", () => {
  assert.throws(() => {
    return parseContinuityCatalog({
      films: [{ ...FILM, frames: "300" }],
      studies: [STUDY],
    });
  });
});
test("rejects missing creative direction in a study", () => {
  const { creativeDirection: _creativeDirection, ...incompleteStudy } = STUDY;
  assert.throws(() => {
    return parseContinuityCatalog({
      films: [FILM],
      studies: [incompleteStudy],
    });
  });
});
test("rejects duplicate catalog ids across families", () => {
  assert.throws(() => {
    return parseContinuityCatalog({
      films: [FILM],
      studies: [{ ...STUDY, id: FILM.id }],
    });
  }, /Duplicate continuity catalog id/);
});
test("rejects a study whose source film is not registered", () => {
  assert.throws(() => {
    return parseContinuityCatalog({
      films: [FILM],
      studies: [{ ...STUDY, sourceFilm: "missing" }],
    });
  }, /Unknown source film/);
});
test("rejects unknown metadata fields instead of silently dropping authored copy", () => {
  assert.throws(() => {
    return parseContinuityCatalog({
      films: [FILM],
      studies: [{ ...STUDY, creativeDirections: "Typo" }],
    });
  });
});
const SCENE_FILM = {
  ...FILM,
  id: "scene-film",
  path: "shot-vocabulary",
  kind: "scene",
};
const SCENE_STUDY = {
  ...STUDY,
  id: "scene-study",
  path: "vocabulary/scene-study",
  kind: "scene",
  sourceFilm: "scene-film",
  controls: [
    { path: "transition.columns", label: "Columns", description: "Count." },
  ],
};
test("accepts storyboard-scene films and studies and keeps their kind", () => {
  assert.deepEqual(
    parseContinuityCatalog({
      films: [FILM, SCENE_FILM],
      studies: [STUDY, SCENE_STUDY],
    }),
    [FILM, SCENE_FILM, STUDY, SCENE_STUDY],
  );
});
test("rejects a scene study whose plan is outside storyboards/vocabulary", () => {
  assert.throws(() => {
    return parseContinuityCatalog({
      films: [SCENE_FILM],
      studies: [{ ...SCENE_STUDY, path: "explainers/scene-study" }],
    });
  }, /storyboards\/vocabulary/);
});
test("rejects unknown study kinds", () => {
  assert.throws(() => {
    return parseContinuityCatalog({
      films: [FILM],
      studies: [{ ...STUDY, kind: "stock" }],
    });
  });
});
