import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";
import { ALL_ATLAS_CATEGORIES } from "../../../gallery/AtlasLayout/AtlasCategoryNav/AtlasCategoryNav";
import { storyboardSchema } from "../../../storyboard/schema/schema";
import { CONTINUITY_CATALOG, isSceneEntry } from "../../continuityCatalog";
import { continuityBeatSchema } from "../../continuitySchema";
import { hasControlPath } from "../../vocabulary/hasControlPath/hasControlPath";
import {
  countCompositionCategories,
  filterCompositionEntries,
  gallerySelectionReducer,
} from "./gallerySelectionReducer";
import type { ContinuityVocabularyEntry } from "../../continuityCatalog";

// Scene studies name shot fields instead; sceneStudies.test.ts checks them.
const CONTINUITY_STUDIES = CONTINUITY_CATALOG.filter(
  (entry): entry is ContinuityVocabularyEntry =>
    entry.family === "vocabulary" && !isSceneEntry(entry),
);
const INITIAL_STATE = {
  family: "films" as const,
  category: ALL_ATLAS_CATEGORIES,
  query: "",
  openId: "qetl-motion",
  captions: false,
};

test("opening another entry resets caption state until its own player responds", () => {
  const opened = gallerySelectionReducer(INITIAL_STATE, {
    type: "open",
    id: "qetl-to-product",
  });
  assert.equal(opened.openId, "qetl-to-product");
  assert.equal(opened.captions, undefined);
  const stale = gallerySelectionReducer(opened, {
    type: "captions",
    id: "qetl-motion",
    captions: false,
  });
  assert.equal(stale.captions, undefined);
  assert.equal(
    gallerySelectionReducer(stale, {
      type: "captions",
      id: "qetl-to-product",
      captions: false,
    }).captions,
    false,
  );
});

test("reopening the active entry retains its current live caption choice", () => {
  assert.equal(
    gallerySelectionReducer(INITIAL_STATE, { type: "open", id: "qetl-motion" })
      .captions,
    false,
  );
});

test("unknown or other-section entries leave the open preview unchanged", () => {
  ["missing-film", "shared-object-handoff"].forEach((id) =>
    assert.deepEqual(
      gallerySelectionReducer(INITIAL_STATE, { type: "open", id }),
      INITIAL_STATE,
    ),
  );
});

test("closing the preview forgets its caption state", () => {
  assert.deepEqual(gallerySelectionReducer(INITIAL_STATE, { type: "close" }), {
    ...INITIAL_STATE,
    openId: undefined,
    captions: undefined,
  });
});

test("the visible entries are the section's family, in the chosen category, matching the search", () => {
  const studies = { ...INITIAL_STATE, family: "vocabulary" as const };
  const transitions = filterCompositionEntries({
    ...studies,
    category: "transitions",
  });
  assert.ok(transitions.length > 0);
  assert.ok(transitions.every((entry) => entry.category === "transitions"));
  assert.deepEqual(
    filterCompositionEntries({ ...studies, query: "UNDERLINE" }).map(
      (entry) => entry.id,
    ),
    ["teaching-underline"],
  );
  assert.ok(
    filterCompositionEntries(INITIAL_STATE).every(
      (entry) => entry.family === "films",
    ),
  );
});

test("each category counts only its own section's entries", () => {
  const counts = countCompositionCategories("vocabulary");
  assert.equal(
    counts.reduce((total, category) => total + category.count, 0),
    CONTINUITY_CATALOG.filter((entry) => entry.family === "vocabulary").length,
  );
  assert.ok(counts.every((category) => category.count > 0));
});

test("vocabulary links resolve to full films and controls name actual beat schema fields", () => {
  const fields = new Set([
    "beats[].duration",
    ...continuityBeatSchema.shape.transition
      .keyof()
      .options.map((key) => `beats[].transition.${key}`),
    ...continuityBeatSchema.shape.token
      .unwrap()
      .keyof()
      .options.map((key) => `beats[].token.${key}`),
    ...continuityBeatSchema.shape.content.options.flatMap((variant) =>
      variant.keyof().options.map((key) => `beats[].content.${key}`),
    ),
    ...continuityBeatSchema.shape.content.options.flatMap((variant) =>
      "diagrams" in variant.shape
        ? variant.shape.diagrams.element
            .keyof()
            .options.map((key) => `beats[].content.diagrams[].${key}`)
        : [],
    ),
  ]);
  CONTINUITY_STUDIES.forEach((entry) => {
    assert.equal(
      CONTINUITY_CATALOG.find((film) => film.id === entry.sourceFilm)?.family,
      "films",
    );
    assert.ok(entry.controls.length > 0, entry.id);
    entry.controls.forEach((control) =>
      assert.ok(fields.has(control.path), control.path),
    );
  });
});

test("each reusable control applies to its study's actual authored beat content", async () => {
  const studies = CONTINUITY_STUDIES;
  await Promise.all(
    studies.map(async (entry) => {
      const file = new URL(
        `../../../../storyboards/${entry.path}.json`,
        import.meta.url,
      );
      const plan = storyboardSchema.parse(
        JSON.parse(await fs.readFile(file, "utf8")),
      );
      const shot = plan.shots[0];
      assert.equal(shot.scene, "continuity");
      if (shot.scene !== "continuity") {
        return;
      }
      entry.controls.forEach((control) =>
        assert.ok(
          hasControlPath(shot.props, control.path.split(".")),
          `${entry.id}: ${control.path}`,
        ),
      );
    }),
  );
});
