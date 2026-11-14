import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { getCameraPose } from "../../motion-components/cameraTrack";
import {
  getMotionEasing,
  resolveMotionSettings,
} from "../../motion-components/motionSettings";
import { storyboardSchema } from "../../storyboard/schema/schema";
import { durationInFrames } from "../../storyboard/schema/timeline";
import { BUILT_IN_VIDEO_THEMES } from "../../videoTheme/builtInVideoThemes/builtInVideoThemes";
import { resolveVideoTheme } from "../../videoTheme/resolveVideoTheme/resolveVideoTheme";
import { createThemePatchFromLegacyAppearance } from "../../videoTheme/themePatches/themePatches";
import { createContinuityPlanFromOptions } from "../continuityAppearance";
import { CONTINUITY_CATALOG } from "../continuityCatalog";
import {
  createContinuityPlanFromVideoTheme,
  createMotionOptionsFromTheme,
} from "./createContinuityPlanFromVideoTheme";
import type { MotionOptions } from "../../motion-components/motionSettings";
import type { Storyboard } from "../../storyboard/schema/schema";
import type { CameraPresetName } from "../../videoTheme/themePatches/themePatches";
import type { VideoThemePatch } from "../../videoTheme/videoTheme.types";

const PRESETS = ["deliberate", "gentle", "balanced", "brisk", "whip"] as const;
const CLASSIC = resolveVideoTheme(BUILT_IN_VIDEO_THEMES, "classic");
const CLASSIC_BLUR = {
  samples: 10,
  velocityBlurFactor: 0.09,
  velocityBlurLimit: 3,
  transitionBlur: 12,
};

function _classicWith(patch: VideoThemePatch) {
  return resolveVideoTheme(BUILT_IN_VIDEO_THEMES, "classic", {
    patches: [patch],
  });
}

function _classicWithCamera(cameraPreset: CameraPresetName) {
  return _classicWith(createThemePatchFromLegacyAppearance({ cameraPreset }));
}

function _readPlan(path: string): Storyboard {
  return storyboardSchema.parse(
    JSON.parse(
      fs.readFileSync(
        new URL(`../../../storyboards/${path}.json`, import.meta.url),
        "utf8",
      ),
    ),
  );
}

const PLANS = CONTINUITY_CATALOG.map((entry) => ({
  id: entry.id,
  plan: _readPlan(entry.path),
}));
const HANDOFF = _readPlan("explainers/study-shared-object-handoff");

function _cameraKeys(plan: Storyboard) {
  return plan.shots.flatMap((shot) =>
    shot.scene !== "continuity"
      ? []
      : shot.props.beats.flatMap((beat) =>
          beat.content.kind === "stock" ? (beat.content.camera ?? []) : [],
        ),
  );
}

/** Every camera pose of every stock beat, frame by frame, with the beat's options or the given ones. */
function _cameraPoses(plan: Storyboard, options?: MotionOptions) {
  return plan.shots.flatMap((shot) =>
    shot.scene !== "continuity"
      ? []
      : shot.props.beats.flatMap((beat) => {
          const content = beat.content;
          return content.kind === "stock" && content.camera
            ? Array.from({ length: beat.duration }, (_, frame) =>
                getCameraPose(
                  content.camera,
                  frame,
                  true,
                  options ?? content.cameraOptions,
                ),
              )
            : [];
        }),
  );
}

test("a motion preset expands from the theme's camera presets", () => {
  assert.deepEqual(
    createMotionOptionsFromTheme({ preset: "whip" }, CLASSIC.semantic),
    {
      speed: 1.5,
      shutterAngle: 240,
      easing: "ease-in-out-cubic",
      ...CLASSIC_BLUR,
    },
  );
});

test("authored motion values win over the theme", () => {
  const options = createMotionOptionsFromTheme(
    { preset: "whip", speed: 2, samples: 4 },
    CLASSIC.semantic,
  );
  assert.deepEqual(
    [options.speed, options.samples, options.shutterAngle],
    [2, 4, 240],
  );
});

test("a cue without a preset keeps its own timing and curve and takes the theme's blur", () => {
  assert.deepEqual(createMotionOptionsFromTheme(undefined, CLASSIC.semantic), {
    shutterAngle: 180,
    ...CLASSIC_BLUR,
  });
});

test("a theme's preset speed reaches the motion", () => {
  const theme = _classicWith({
    other: { video: { atomic: { cameraSpeed: { whip: 2 } } } },
  });
  assert.equal(
    createMotionOptionsFromTheme({ preset: "whip" }, theme.semantic).speed,
    2,
  );
});

test("the unthemed motion presets and blur defaults equal classic's", () => {
  for (const preset of PRESETS) {
    const themed = createMotionOptionsFromTheme({ preset }, CLASSIC.semantic);
    const unthemed = resolveMotionSettings({ preset });
    assert.deepEqual(
      [themed.speed, themed.shutterAngle],
      [unthemed.speed, unthemed.shutterAngle],
      preset,
    );
    for (const progress of [0.1, 0.25, 0.5, 0.75, 0.9]) {
      assert.equal(
        getMotionEasing({ easing: themed.easing })(progress),
        getMotionEasing({ preset })(progress),
        preset,
      );
    }
  }
  const {
    shutterAngle,
    samples,
    velocityBlurFactor,
    velocityBlurLimit,
    transitionBlur,
  } = resolveMotionSettings();
  assert.deepEqual(createMotionOptionsFromTheme(undefined, CLASSIC.semantic), {
    shutterAngle,
    samples,
    velocityBlurFactor,
    velocityBlurLimit,
    transitionBlur,
  });
});

test("classic keeps every catalog film's timing and camera path", () => {
  for (const { id, plan } of PLANS) {
    const themed = createContinuityPlanFromVideoTheme(plan, CLASSIC);
    assert.equal(durationInFrames(themed), durationInFrames(plan), id);
    assert.deepEqual(_cameraPoses(themed), _cameraPoses(plan), id);
    assert.equal(storyboardSchema.safeParse(themed).success, true, id);
  }
});

test("a theme camera preset lengthens travel without truncating holds or modifying the plan", () => {
  const before = structuredClone(HANDOFF);
  const themed = createContinuityPlanFromVideoTheme(
    HANDOFF,
    _classicWithCamera("deliberate"),
  );
  assert.deepEqual(HANDOFF, before);
  assert.ok(
    themed.shots[0].durationInFrames > HANDOFF.shots[0].durationInFrames,
  );
  assert.deepEqual(themed.narration, HANDOFF.narration);
  const shot = themed.shots[0];
  const content =
    shot.scene === "continuity" ? shot.props.beats[0].content : undefined;
  assert.deepEqual(
    content?.kind === "stock" ? content.cameraOptions : undefined,
    {
      speed: 0.25,
      shutterAngle: 45,
      easing: [0.45, 0, 0.55, 1],
      ...CLASSIC_BLUR,
    },
  );
});

test("every theme camera preset moves the camera exactly as the matching motion preset", () => {
  for (const preset of PRESETS) {
    const themed = createContinuityPlanFromVideoTheme(
      HANDOFF,
      _classicWithCamera(preset),
    );
    assert.deepEqual(
      _cameraPoses(themed),
      _cameraPoses(themed, { preset }),
      preset,
    );
  }
});

test("every catalog film stays valid with every theme camera preset, which camera motion off ignores", () => {
  for (const { id, plan } of PLANS) {
    const still = createContinuityPlanFromOptions(plan, {
      cameraMotion: false,
    });
    for (const preset of PRESETS) {
      const result = storyboardSchema.safeParse(
        createContinuityPlanFromVideoTheme(plan, _classicWithCamera(preset)),
      );
      assert.equal(
        result.success,
        true,
        `${id}: ${preset}: ${result.error?.message}`,
      );
      assert.deepEqual(
        createContinuityPlanFromVideoTheme(still, _classicWithCamera(preset)),
        createContinuityPlanFromVideoTheme(still, CLASSIC),
        `${id}: ${preset}`,
      );
    }
  }
});

test("applying the same theme twice changes nothing", () => {
  const theme = _classicWithCamera("gentle");
  const once = createContinuityPlanFromVideoTheme(HANDOFF, theme);
  assert.deepEqual(createContinuityPlanFromVideoTheme(once, theme), once);
});

test("the theme's zoom limit keeps every camera key inside it and inside the diagram", () => {
  const theme = _classicWith({
    other: { video: { atomic: { zoom: { max: 1.5 } } } },
  });
  assert.ok(_cameraKeys(HANDOFF).some((key) => key.zoom > 1.5));
  for (const { id, plan } of PLANS) {
    const themed = createContinuityPlanFromVideoTheme(plan, theme);
    assert.ok(
      _cameraKeys(themed).every((key) => key.zoom <= 1.5),
      id,
    );
    assert.equal(storyboardSchema.safeParse(themed).success, true, id);
  }
});

test("a camera curve that overshoots its framings is refused", () => {
  // The resolver refuses the curve before the plan is themed.
  const patch = {
    other: {
      video: {
        semantic: { camera: { easing: { push: "$atomic.easing.outBack" } } },
      },
    },
  };
  assert.throws(
    () => createContinuityPlanFromVideoTheme(HANDOFF, _classicWith(patch)),
    /camera\.easing\.push/,
  );
});
