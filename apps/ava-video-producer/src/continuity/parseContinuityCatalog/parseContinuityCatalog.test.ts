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
  assert.deepEqual(parseContinuityCatalog([FILM], [STUDY]), [FILM, STUDY]);
});

test("rejects nonnumeric frame counts in authored metadata", () => {
  assert.throws(() =>
    parseContinuityCatalog([{ ...FILM, frames: "300" }], [STUDY]),
  );
});

test("rejects missing creative direction in a study", () => {
  const { creativeDirection: _creativeDirection, ...incompleteStudy } = STUDY;
  assert.throws(() => parseContinuityCatalog([FILM], [incompleteStudy]));
});

test("rejects duplicate catalog ids across families", () => {
  assert.throws(
    () => parseContinuityCatalog([FILM], [{ ...STUDY, id: FILM.id }]),
    /Duplicate continuity catalog id/,
  );
});

test("rejects a study whose source film is not registered", () => {
  assert.throws(
    () => parseContinuityCatalog([FILM], [{ ...STUDY, sourceFilm: "missing" }]),
    /Unknown source film/,
  );
});

test("rejects unknown metadata fields instead of silently dropping authored copy", () => {
  assert.throws(() =>
    parseContinuityCatalog([FILM], [{ ...STUDY, creativeDirections: "Typo" }]),
  );
});
