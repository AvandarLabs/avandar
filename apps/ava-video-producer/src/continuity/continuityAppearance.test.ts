import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { storyboardSchema } from "../storyboard/schema/schema";
import {
  continuityAppearanceSchema,
  createContinuityPlanFromOptions,
} from "./continuityAppearance";
import { CONTINUITY_CATALOG } from "./continuityCatalog";

function _readFirstStudy() {
  return storyboardSchema.parse(
    JSON.parse(
      fs.readFileSync(
        new URL(
          `../../storyboards/${CONTINUITY_CATALOG[0].path}.json`,
          import.meta.url,
        ),
        "utf8",
      ),
    ),
  );
}

test("render options reach every continuity shot without mutating the plan", () => {
  const plan = _readFirstStudy();
  const before = structuredClone(plan);
  const copy = createContinuityPlanFromOptions(plan, {
    cameraMotion: false,
    annotations: false,
  });
  assert.deepEqual(plan, before);
  copy.shots.forEach((shot, index) => {
    const original = plan.shots[index];
    if (shot.scene !== "continuity" || original.scene !== "continuity") {
      assert.equal(shot, original);
      return;
    }
    assert.equal(shot.props.cameraMotion, false);
    assert.equal(shot.props.annotations, false);
    assert.equal(shot.props.beats, original.props.beats);
  });
});

test("omitted options keep the authored flags", () => {
  const authored = createContinuityPlanFromOptions(_readFirstStudy(), {
    motionBlur: false,
  });
  assert.deepEqual(createContinuityPlanFromOptions(authored, {}), authored);
});

test("every render option defaults to on", () => {
  assert.deepEqual(continuityAppearanceSchema.parse({}), {
    captions: true,
    cameraMotion: true,
    motionBlur: true,
    annotations: true,
  });
});

test("colours, sketch levels, and camera presets are not render options", () => {
  [
    { accent: "#123456" },
    { boxRoughness: 1 },
    { annotationRoughness: 1 },
    { cameraPreset: "whip" },
  ].forEach((option) => {
    assert.equal(
      continuityAppearanceSchema.safeParse(option).success,
      false,
      Object.keys(option)[0],
    );
  });
});
