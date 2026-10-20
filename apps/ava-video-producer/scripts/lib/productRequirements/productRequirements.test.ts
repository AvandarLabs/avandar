import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { storyboardSchema } from "../../../src/storyboard/schema/schema";
import { previewFrames } from "../planHelpers";
import { productRequirements } from "./productRequirements";

const readFilm = (id: string) =>
  storyboardSchema.parse(
    JSON.parse(
      readFileSync(
        new URL(
          `../../../storyboards/explainers/film-${id}.json`,
          import.meta.url,
        ),
        "utf8",
      ),
    ),
  );

test("nested product beats select the product build and entry without affecting motion-only films", () => {
  assert.deepEqual(productRequirements(readFilm("ontology-to-product")), {
    needsProduct: true,
    needsMap: false,
  });
  assert.deepEqual(productRequirements(readFilm("qetl-motion")), {
    needsProduct: false,
    needsMap: false,
  });
});

test("preview sampling includes incoming overlap and resolved poses inside a continuity shot", () => {
  const plan = readFilm("qetl-motion");
  const shot = plan.shots[0];
  assert.equal(shot.scene, "continuity");
  if (shot.scene !== "continuity") return;
  const incoming =
    shot.props.beats[0].duration - shot.props.beats[1].transition.frames;
  const frames = previewFrames(plan);
  for (const frame of [
    incoming - 1,
    incoming,
    incoming + Math.floor(shot.props.beats[1].transition.frames / 2),
    incoming + 180,
  ])
    assert.ok(frames.includes(frame), `Missing nested frame ${frame}`);
});
