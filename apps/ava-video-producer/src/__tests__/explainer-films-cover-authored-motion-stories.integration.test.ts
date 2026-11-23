import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";
import { ContinuityTimeline } from "../continuity/ContinuityTimeline/ContinuityTimeline";
import { storyboardSchema } from "../storyboard/schema/schema";

const EXPECTED_FILM_CATEGORIES = {
  "motion-motion": 4,
  "motion-product": 2,
  "product-motion": 2,
  composite: 2,
};

test("ten full films cover four motion stories and two of every product relationship", async () => {
  const directory = new URL("../../storyboards/explainers/", import.meta.url);
  const files = (await fs.readdir(directory)).filter((name) => {
    return name.startsWith("film-");
  });
  assert.equal(files.length, 10);
  const categories: Record<string, number> = {};
  const productSegments: string[] = [];
  for (const file of files) {
    const plan = storyboardSchema.parse(
      JSON.parse(await fs.readFile(new URL(file, directory), "utf8")),
    );
    const shot = plan.shots[0];
    assert.equal(shot.scene, "continuity");
    if (shot.scene !== "continuity") {
      continue;
    }
    categories[shot.props.category] =
      (categories[shot.props.category] ?? 0) + 1;
    const timeline = ContinuityTimeline.getContinuityTimeline(shot.props.beats);
    assert.equal(shot.durationInFrames, timeline[timeline.length - 1].end);
    assert.ok(
      shot.durationInFrames >= 1350 && shot.durationInFrames <= 2250,
      file,
    );
    assert.ok(plan.narration.length >= 8, file);
    productSegments.push(
      ...shot.props.beats.flatMap((beat) => {
        return beat.content.kind === "product" ||
          beat.content.kind === "composite"
          ? [beat.content.segment.feature]
          : [];
      }),
    );
  }
  assert.deepEqual(categories, EXPECTED_FILM_CATEGORIES);
  assert.equal(
    new Set(productSegments).size,
    6,
    "Each UI sequence belongs to a distinct feature adapter",
  );
});
