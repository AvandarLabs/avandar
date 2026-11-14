import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { storyboardSchema } from "../storyboard/schema/schema";
import {
  createContinuityPlanFromOptions,
  continuityAppearanceSchema,
} from "./continuityAppearance";
import { CONTINUITY_CATALOG } from "./continuityCatalog";

function _readFirstPlan() {
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

test("appearance copies render options without mutating product beats or timing", () => {
  const plan = _readFirstPlan();
  const before = structuredClone(plan);
  const options = { cameraMotion: false };
  const copy = createContinuityPlanFromOptions(plan, options);
  assert.deepEqual(plan, before);
  assert.deepEqual(copy.narration, plan.narration);
  copy.shots.forEach((shot, index) => {
    const original = plan.shots[index];
    if (shot.scene !== "continuity") return assert.equal(shot, original);
    assert.equal(shot.props.cameraMotion, false);
    if (original.scene === "continuity")
      assert.equal(shot.props.beats, original.props.beats);
  });
});

test("palette and roughness never reach shot props", () => {
  const copy = createContinuityPlanFromOptions(_readFirstPlan(), {
    accent: "#123456",
    boxRoughness: 3,
  });
  const shot = copy.shots.find((candidate) => candidate.scene === "continuity");
  assert.equal(shot?.scene === "continuity" && "accent" in shot.props, false);
  assert.equal(
    shot?.scene === "continuity" && "boxRoughness" in shot.props,
    false,
  );
});
test("appearance protocol validates colors and boolean defaults", () => {
  assert.equal(continuityAppearanceSchema.parse({}).cameraMotion, true);
  assert.equal(
    continuityAppearanceSchema.safeParse({ cameraMotion: "false" }).success,
    false,
  );
  assert.equal(
    continuityAppearanceSchema.safeParse({ accent: "red" }).success,
    false,
  );
  assert.equal(
    continuityAppearanceSchema.safeParse({ unknown: true }).success,
    false,
  );
});

test("omitted appearance values preserve authored flags", () => {
  const authored = createContinuityPlanFromOptions(_readFirstPlan(), {
    cameraMotion: false,
    motionBlur: false,
    annotations: false,
  });
  assert.deepEqual(createContinuityPlanFromOptions(authored, {}), authored);
  const shot = authored.shots.find(
    (candidate) => candidate.scene === "continuity",
  );
  assert.equal(shot?.scene === "continuity" && shot.props.annotations, false);
  assert.equal(shot?.scene === "continuity" && shot.props.motionBlur, false);
  assert.equal(shot?.scene === "continuity" && shot.props.cameraMotion, false);
});

test("roughness defaults preserve sketch annotations and smooth boxes", () => {
  const appearance = continuityAppearanceSchema.parse({});
  assert.equal(appearance.annotationRoughness, 1.5);
  assert.equal(appearance.boxRoughness, 0);
});

test("roughness accepts independent finite levels from zero to three", () => {
  for (const key of ["annotationRoughness", "boxRoughness"]) {
    for (const value of [0, 0.5, 1.5, 3]) {
      assert.equal(
        continuityAppearanceSchema.safeParse({ [key]: value }).success,
        true,
      );
    }
    for (const value of [-1, 3.1, Infinity, NaN, "1.5", true]) {
      assert.equal(
        continuityAppearanceSchema.safeParse({ [key]: value }).success,
        false,
      );
    }
  }
});

test("camera presets extend travel without truncating holds or mutating authored plans", () => {
  const plan = storyboardSchema.parse(
    JSON.parse(
      fs.readFileSync(
        new URL(
          "../../storyboards/explainers/study-shared-object-handoff.json",
          import.meta.url,
        ),
        "utf8",
      ),
    ),
  );
  const before = structuredClone(plan);
  const changed = createContinuityPlanFromOptions(plan, {
    cameraPreset: "deliberate",
  });
  assert.deepEqual(plan, before);
  assert.ok(changed.shots[0].durationInFrames > plan.shots[0].durationInFrames);
  assert.equal(storyboardSchema.safeParse(changed).success, true);
  assert.deepEqual(changed.narration, plan.narration);
  const shot = changed.shots[0];
  assert.equal(shot.scene, "continuity");
  if (shot.scene === "continuity") {
    const content = shot.props.beats[0].content;
    assert.equal(content.kind, "stock");
    if (content.kind === "stock") {
      assert.deepEqual(content.cameraOptions, { preset: "deliberate" });
    }
  }
  assert.deepEqual(
    createContinuityPlanFromOptions(plan, { cameraPreset: "authored" }),
    plan,
  );
});

test("camera preset validation accepts the five profiles and the authored default", () => {
  assert.equal(continuityAppearanceSchema.parse({}).cameraPreset, "authored");
  ["deliberate", "gentle", "balanced", "brisk", "whip"].forEach(
    (cameraPreset) => {
      assert.equal(
        continuityAppearanceSchema.safeParse({ cameraPreset }).success,
        true,
      );
    },
  );
  assert.equal(
    continuityAppearanceSchema.safeParse({ cameraPreset: "fast" }).success,
    false,
  );
});

test("every catalog film remains valid with every camera preset", () => {
  CONTINUITY_CATALOG.forEach((entry) => {
    const plan = storyboardSchema.parse(
      JSON.parse(
        fs.readFileSync(
          new URL(`../../storyboards/${entry.path}.json`, import.meta.url),
          "utf8",
        ),
      ),
    );
    ["deliberate", "gentle", "balanced", "brisk", "whip"].forEach(
      (cameraPreset) => {
        const changed = createContinuityPlanFromOptions(plan, { cameraPreset });
        const result = storyboardSchema.safeParse(changed);
        assert.equal(
          result.success,
          true,
          `${entry.id}: ${cameraPreset}: ${result.error?.message}`,
        );
        assert.deepEqual(
          createContinuityPlanFromOptions(plan, {
            cameraPreset,
            cameraMotion: false,
          }),
          createContinuityPlanFromOptions(plan, { cameraMotion: false }),
        );
      },
    );
  });
});
