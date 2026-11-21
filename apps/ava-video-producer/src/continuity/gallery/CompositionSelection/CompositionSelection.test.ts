import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";
import { prop, propEq } from "@avandar/utils";
import { ALL_ATLAS_CATEGORIES } from "../../../gallery/AtlasLayout/AtlasCategoryNav/AtlasCategoryNav";
import { storyboardSchema } from "../../../storyboard/schema/schema";
import { continuityBeatSchema } from "../../continuitySchema/continuitySchema";
import {
  CONTINUITY_CATALOG,
  isSceneEntry,
  type ContinuityVocabularyEntry,
} from "../../isSceneEntry";
import { hasControlPath } from "../../vocabulary/hasControlPath/hasControlPath";
import { CompositionSelection } from "./CompositionSelection";

// Scene studies name shot fields instead; sceneStudies.test.ts checks them.
const CONTINUITY_STUDIES = CONTINUITY_CATALOG.filter(
  (entry): entry is ContinuityVocabularyEntry => {
    return entry.family === "vocabulary" && !isSceneEntry(entry);
  },
);

const INITIAL_STATE = {
  family: "films" as const,
  category: ALL_ATLAS_CATEGORIES,
  query: "",
  openId: "qetl-motion",
  captions: false,
};

test("opening another entry resets caption state until its own player responds", () => {
  const opened = CompositionSelection.gallerySelectionReducer(INITIAL_STATE, {
    type: "open",
    id: "qetl-to-product",
  });
  assert.equal(opened.openId, "qetl-to-product");
  assert.equal(opened.captions, undefined);
  const stale = CompositionSelection.gallerySelectionReducer(opened, {
    type: "captions",
    id: "qetl-motion",
    captions: false,
  });
  assert.equal(stale.captions, undefined);
  assert.equal(
    CompositionSelection.gallerySelectionReducer(stale, {
      type: "captions",
      id: "qetl-to-product",
      captions: false,
    }).captions,
    false,
  );
});

test("reopening the active entry retains its current live caption choice", () => {
  assert.equal(
    CompositionSelection.gallerySelectionReducer(INITIAL_STATE, {
      type: "open",
      id: "qetl-motion",
    }).captions,
    false,
  );
});

test("unknown or other-section entries leave the open preview unchanged", () => {
  ["missing-film", "shared-object-handoff"].forEach((id) => {
    return assert.deepEqual(
      CompositionSelection.gallerySelectionReducer(INITIAL_STATE, {
        type: "open",
        id,
      }),
      INITIAL_STATE,
    );
  });
});

test("closing the preview forgets its caption state", () => {
  assert.deepEqual(
    CompositionSelection.gallerySelectionReducer(INITIAL_STATE, {
      type: "close",
    }),
    {
      ...INITIAL_STATE,
      openId: undefined,
      captions: undefined,
    },
  );
});

test("the visible entries are the section's family, in the chosen category, matching the search", () => {
  const studies = { ...INITIAL_STATE, family: "vocabulary" as const };
  const transitions = CompositionSelection.filterCompositionEntries({
    ...studies,
    category: "transitions",
  });
  assert.ok(transitions.length > 0);
  assert.ok(transitions.every(propEq("category", "transitions")));
  assert.deepEqual(
    CompositionSelection.filterCompositionEntries({
      ...studies,
      query: "UNDERLINE",
    }).map(prop("id")),
    ["teaching-underline"],
  );
  assert.ok(
    CompositionSelection.filterCompositionEntries(INITIAL_STATE).every(
      (entry) => {
        return entry.family === "films";
      },
    ),
  );
});

test("each category counts only its own section's entries", () => {
  const counts = CompositionSelection.countCompositionCategories("vocabulary");
  assert.equal(
    counts.reduce((total, category) => {
      return total + category.count;
    }, 0),
    CONTINUITY_CATALOG.filter((entry) => {
      return entry.family === "vocabulary";
    }).length,
  );
  assert.ok(
    counts.every((category) => {
      return category.count > 0;
    }),
  );
});

test("vocabulary links resolve to full films and controls name actual beat schema fields", () => {
  const fields = new Set([
    "beats[].duration",
    ...continuityBeatSchema.shape.transition.keyof().options.map((key) => {
      return `beats[].transition.${key}`;
    }),
    ...continuityBeatSchema.shape.token
      .unwrap()
      .keyof()
      .options.map((key) => {
        return `beats[].token.${key}`;
      }),
    ...continuityBeatSchema.shape.content.options.flatMap((variant) => {
      return variant.keyof().options.map((key) => {
        return `beats[].content.${key}`;
      });
    }),
    ...continuityBeatSchema.shape.content.options.flatMap((variant) => {
      return "diagrams" in variant.shape
        ? variant.shape.diagrams.element.keyof().options.map((key) => {
            return `beats[].content.diagrams[].${key}`;
          })
        : [];
    }),
  ]);
  CONTINUITY_STUDIES.forEach((entry) => {
    assert.equal(
      CONTINUITY_CATALOG.find(propEq("id", entry.sourceFilm))?.family,
      "films",
    );
    assert.ok(entry.controls.length > 0, entry.id);
    entry.controls.forEach((control) => {
      return assert.ok(fields.has(control.path), control.path);
    });
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
      entry.controls.forEach((control) => {
        return assert.ok(
          hasControlPath({
            value: shot.props,
            path: control.path.split("."),
          }),
          `${entry.id}: ${control.path}`,
        );
      });
    }),
  );
});
