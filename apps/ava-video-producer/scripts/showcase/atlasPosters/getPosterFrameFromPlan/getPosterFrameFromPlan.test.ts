import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { storyboardSchema } from "../../../../src/storyboard/schema/schema";
import { durationInFrames } from "../../../../src/storyboard/schema/timeline";
import { appRoot } from "../../ShowcaseFilms/ShowcaseFilms";
import { getPosterFrameFromPlan } from "./getPosterFrameFromPlan";

async function _readPlan(relative: string) {
  return storyboardSchema.parse(
    JSON.parse(
      await fs.readFile(path.join(appRoot, "storyboards", relative), "utf8"),
    ),
  );
}

test("a continuity poster holds on the middle beat, clear of both transitions", async () => {
  const plan = await _readPlan("explainers/study-shared-object-handoff.json");
  const frame = getPosterFrameFromPlan(plan);
  const shot = plan.shots[0];
  assert.equal(shot.scene, "continuity");
  // Two beats: the poster shows the second, after the handoff has landed.
  const firstBeat = shot.scene === "continuity" ? shot.props.beats[0] : null;
  assert.ok(firstBeat && frame > firstBeat.duration);
  assert.ok(frame < durationInFrames(plan));
});

test("a scene-plan poster sits inside the middle shot", async () => {
  const plan = await _readPlan("shot-vocabulary.json");
  const frame = getPosterFrameFromPlan(plan);
  assert.ok(frame > 0);
  assert.ok(frame < durationInFrames(plan));
});
