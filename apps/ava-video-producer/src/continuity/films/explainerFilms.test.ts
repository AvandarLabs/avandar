import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs/promises";
import { storyboardSchema } from "../../storyboard/schema/schema";
import { getContinuityTimeline } from "../continuityTimeline";

test("ten full films cover four motion stories and two of every product relationship", async () => {
  const directory = new URL(
    "../../../storyboards/explainers/",
    import.meta.url,
  );
  const files = (await fs.readdir(directory)).filter((name) =>
    name.startsWith("film-"),
  );
  assert.equal(files.length, 10);
  const categories: Record<string, number> = {};
  const productSegments: string[] = [];
  for (const file of files) {
    const plan = storyboardSchema.parse(
      JSON.parse(await fs.readFile(new URL(file, directory), "utf8")),
    );
    const shot = plan.shots[0];
    assert.equal(shot.scene, "continuity");
    if (shot.scene !== "continuity") continue;
    categories[shot.props.category] =
      (categories[shot.props.category] ?? 0) + 1;
    const timeline = getContinuityTimeline(shot.props.beats);
    assert.equal(shot.durationInFrames, timeline[timeline.length - 1].end);
    assert.ok(
      shot.durationInFrames >= 1350 && shot.durationInFrames <= 2250,
      file,
    );
    assert.ok(plan.narration.length >= 8, file);
    for (const beat of shot.props.beats) {
      if (beat.content.kind === "product" || beat.content.kind === "composite")
        productSegments.push(beat.content.segment.feature);
    }
  }
  assert.deepEqual(categories, {
    "motion-motion": 4,
    "motion-product": 2,
    "product-motion": 2,
    composite: 2,
  });
  assert.equal(
    new Set(productSegments).size,
    6,
    "Each UI sequence belongs to a distinct feature adapter",
  );
});
