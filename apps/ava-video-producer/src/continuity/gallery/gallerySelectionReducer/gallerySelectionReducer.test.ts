import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";
import { storyboardSchema } from "../../../storyboard/schema/schema";
import { CONTINUITY_CATALOG } from "../../continuityCatalog";
import { continuityBeatSchema } from "../../continuitySchema";
import { gallerySelectionReducer } from "./gallerySelectionReducer";

const INITIAL_STATE = {
  selectedId: "qetl-motion",
  family: "films" as const,
  query: "query",
  captions: false,
};

function _hasControlPath(value: unknown, path: readonly string[]): boolean {
  const [head, ...tail] = path;
  if (!head) {
    return true;
  }
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const key = head.endsWith("[]") ? head.slice(0, -2) : head;
  const child: unknown = Reflect.get(value, key);
  return head.endsWith("[]")
    ? Array.isArray(child) &&
        child.some((item: unknown) => _hasControlPath(item, tail))
    : key in value && _hasControlPath(child, tail);
}

test("switching families selects that family's first entry and awaits player options", () => {
  assert.deepEqual(
    gallerySelectionReducer(INITIAL_STATE, {
      type: "family",
      family: "vocabulary",
    }),
    {
      selectedId: "shared-object-handoff",
      family: "vocabulary",
      query: "",
      captions: undefined,
    },
  );
});

test("selecting another entry resets caption state until its own player responds", () => {
  const selected = gallerySelectionReducer(INITIAL_STATE, {
    type: "select",
    id: "qetl-to-product",
  });
  assert.equal(selected.captions, undefined);
  const stale = gallerySelectionReducer(selected, {
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

test("reselecting the active entry retains its current live caption choice", () => {
  assert.equal(
    gallerySelectionReducer(INITIAL_STATE, {
      type: "select",
      id: "qetl-motion",
    }).captions,
    false,
  );
});

test("unknown entry selection preserves the current screening", () => {
  assert.deepEqual(
    gallerySelectionReducer(INITIAL_STATE, {
      type: "select",
      id: "missing-film",
    }),
    INITIAL_STATE,
  );
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
  CONTINUITY_CATALOG.filter((entry) => entry.family === "vocabulary").forEach(
    (entry) => {
      assert.equal(
        CONTINUITY_CATALOG.find((film) => film.id === entry.sourceFilm)?.family,
        "films",
      );
      assert.ok(entry.controls.length > 0, entry.id);
      entry.controls.forEach((control) =>
        assert.ok(fields.has(control.path), control.path),
      );
    },
  );
});

test("each reusable control applies to its study's actual authored beat content", async () => {
  const studies = CONTINUITY_CATALOG.filter(
    (entry) => entry.family === "vocabulary",
  );
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
          _hasControlPath(shot.props, control.path.split(".")),
          `${entry.id}: ${control.path}`,
        ),
      );
    }),
  );
});
