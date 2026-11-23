import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { CameraTrack } from "../../../motion-components/CameraTrack/CameraTrack";
import { MotionSettings } from "../../../motion-components/MotionSettings/MotionSettings";
import { storyboardSchema } from "../../../storyboard/schema/schema";
import { StoryboardTimeline } from "../../../storyboard/schema/StoryboardTimeline";
import { makeResolvedVideoThemeFromLibrary } from "../../../videoTheme/makeResolvedVideoThemeFromLibrary/makeResolvedVideoThemeFromLibrary";
import { BUILT_IN_VIDEO_THEMES } from "../../../videoTheme/makeVideoThemeLibraryFromDocuments/makeVideoThemeLibraryFromDocuments";
import { CONTINUITY_CATALOG } from "../../isSceneEntry";
import { ContinuityThemePlans } from "../ContinuityThemePlans";
import type {
  MotionOptions,
  MotionSettingsTheme,
} from "../../../motion-components/MotionSettings/MotionSettings";
import type { Storyboard } from "../../../storyboard/schema/schema";
import type { VideoThemePatch } from "../../../videoTheme/videoTheme.types";

const PRESETS = ["deliberate", "gentle", "balanced", "brisk", "whip"] as const;
const CLASSIC = makeResolvedVideoThemeFromLibrary({
  library: BUILT_IN_VIDEO_THEMES,
  themeId: "classic",
});
const CLASSIC_BLUR = {
  samples: 10,
  velocityBlurFactor: 0.09,
  velocityBlurLimit: 3,
  transitionBlur: 12,
};
function _classicWith(
  patch: VideoThemePatch,
): ReturnType<typeof makeResolvedVideoThemeFromLibrary> {
  return makeResolvedVideoThemeFromLibrary({
    library: BUILT_IN_VIDEO_THEMES,
    themeId: "classic",
    scope: {
      patches: [patch],
    },
  });
}
function _classicWithCamera(
  cameraPreset: "authored" | (typeof PRESETS)[number],
): ReturnType<typeof makeResolvedVideoThemeFromLibrary> {
  return _classicWith({
    other: { video: { semantic: { camera: { preset: cameraPreset } } } },
  });
}
function _readPlan(path: string): Storyboard {
  return storyboardSchema.parse(
    JSON.parse(
      fs.readFileSync(
        new URL(`../../../../storyboards/${path}.json`, import.meta.url),
        "utf8",
      ),
    ),
  );
}
const PLANS = CONTINUITY_CATALOG.map((entry) => {
  return { id: entry.id, plan: _readPlan(entry.path) };
});
const HANDOFF = _readPlan("explainers/study-shared-object-handoff");
function _cameraKeys(
  plan: Storyboard,
): Array<
  import("../../../motion-components/CameraTrack/CameraTrack").CameraKeyframe
> {
  return plan.shots.flatMap((shot) => {
    return shot.scene !== "continuity"
      ? []
      : shot.props.beats.flatMap((beat) => {
          return beat.content.kind === "stock"
            ? (beat.content.camera ?? [])
            : [];
        });
  });
}
/**
 * Every camera pose of every stock beat, frame by frame, with the beat's
 * options or the given ones.
 */
function _cameraPoses({
  plan,
  options,
}: Readonly<{
  plan: Storyboard;
  options?: MotionOptions;
}>): Array<
  import("../../../motion-components/CameraTrack/CameraTrack").CameraPose
> {
  return plan.shots.flatMap((shot) => {
    return shot.scene !== "continuity"
      ? []
      : shot.props.beats.flatMap((beat) => {
          const content = beat.content;
          return content.kind === "stock" && content.camera
            ? Array.from({ length: beat.duration }, (_, frame) => {
                return CameraTrack.getPose({
                  keys: content.camera,
                  frame,
                  enabled: true,
                  options: options ?? content.cameraOptions,
                });
              })
            : [];
        });
  });
}
test("a motion preset expands from the theme's camera presets", () => {
  assert.deepEqual(
    ContinuityThemePlans.makeMotionOptionsFromTheme({
      options: { preset: "whip" },
      semantic: CLASSIC.semantic,
    }),
    {
      speed: 1.5,
      shutterAngle: 240,
      easing: "ease-in-out-cubic",
      ...CLASSIC_BLUR,
    },
  );
});
test("authored motion values win over the theme", () => {
  const options = ContinuityThemePlans.makeMotionOptionsFromTheme({
    options: { preset: "whip", speed: 2, samples: 4 },
    semantic: CLASSIC.semantic,
  });
  assert.deepEqual(
    [options.speed, options.samples, options.shutterAngle],
    [2, 4, 240],
  );
});
test("a cue without a preset takes the default preset's speed, keeps its curve, and takes the theme's blur", () => {
  assert.deepEqual(
    ContinuityThemePlans.makeMotionOptionsFromTheme({
      options: undefined,
      semantic: CLASSIC.semantic,
    }),
    {
      speed: 1,
      shutterAngle: 180,
      ...CLASSIC_BLUR,
    },
  );
});
test("a theme's preset speed reaches the motion", () => {
  const theme = _classicWith({
    other: { video: { atomic: { cameraSpeed: { whip: 2 } } } },
  });
  assert.equal(
    ContinuityThemePlans.makeMotionOptionsFromTheme({
      options: { preset: "whip" },
      semantic: theme.semantic,
    }).speed,
    2,
  );
});
test("the unthemed motion presets equal classic's", () => {
  PRESETS.forEach((preset) => {
    const themed = ContinuityThemePlans.makeMotionOptionsFromTheme({
      options: { preset },
      semantic: CLASSIC.semantic,
    });
    const unthemed = MotionSettings.resolveMotionSettings({
      options: { preset },
    });
    assert.deepEqual(
      [themed.speed, themed.shutterAngle],
      [unthemed.speed, unthemed.shutterAngle],
      preset,
    );
    [0.1, 0.25, 0.5, 0.75, 0.9].forEach((progress) => {
      assert.equal(
        MotionSettings.getMotionEasing({ options: { easing: themed.easing } })(
          progress,
        ),
        MotionSettings.getMotionEasing({ options: { preset } })(progress),
        preset,
      );
    });
  });
});

test("the unthemed blur defaults equal classic's", () => {
  const {
    speed,
    shutterAngle,
    samples,
    velocityBlurFactor,
    velocityBlurLimit,
    transitionBlur,
  } = MotionSettings.resolveMotionSettings({});
  assert.deepEqual(
    ContinuityThemePlans.makeMotionOptionsFromTheme({
      options: undefined,
      semantic: CLASSIC.semantic,
    }),
    {
      speed,
      shutterAngle,
      samples,
      velocityBlurFactor,
      velocityBlurLimit,
      transitionBlur,
    },
  );
});
test("classic keeps every catalog film's timing and camera path", () => {
  PLANS.forEach(({ id, plan }) => {
    const themed = ContinuityThemePlans.fromVideoTheme({
      plan,
      theme: CLASSIC,
    });
    assert.equal(
      StoryboardTimeline.durationInFrames(themed),
      StoryboardTimeline.durationInFrames(plan),
      id,
    );
    assert.deepEqual(
      _cameraPoses({ plan: themed }),
      _cameraPoses({ plan }),
      id,
    );
    assert.equal(storyboardSchema.safeParse(themed).success, true, id);
  });
});
/**
 * Each continuity shot's beats with the reading hold each one keeps between
 * its incoming and outgoing overlap, and the frame its `TransitionSeries`
 * ends on, with overlaps sized as `ContinuityScene` sizes them.
 */
function _renderedBeatSchedules({
  plan,
  settings,
}: Readonly<{
  plan: Storyboard;
  settings?: MotionSettingsTheme;
}>): Array<{
  shot: Storyboard["shots"][number];
  holds: number[];
  end: number;
}> {
  return plan.shots.flatMap((shot) => {
    if (shot.scene !== "continuity") {
      return [];
    }
    const { beats } = shot.props;
    const overlaps = beats.map((beat, index) => {
      return index === 0
        ? 0
        : MotionSettings.getMotionDuration({
            frames: beat.transition.frames,
            options: beat.transition.motion,
            theme: settings,
          });
    });
    const holds = beats.map((beat, index) => {
      return beat.duration - overlaps[index] - (overlaps[index + 1] ?? 0);
    });
    const end = beats.reduce((sum, beat, index) => {
      return sum + beat.duration - overlaps[index];
    }, 0);
    return [{ shot, holds, end }];
  });
}
