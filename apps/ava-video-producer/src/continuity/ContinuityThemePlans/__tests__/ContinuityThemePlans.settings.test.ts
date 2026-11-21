import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { CameraTrack } from "../../../motion-components/CameraTrack/CameraTrack";
import { MotionSettings } from "../../../motion-components/MotionSettings/MotionSettings";
import { storyboardSchema } from "../../../storyboard/schema/schema";
import { makeResolvedVideoThemeFromLibrary } from "../../../videoTheme/makeResolvedVideoThemeFromLibrary/makeResolvedVideoThemeFromLibrary";
import { BUILT_IN_VIDEO_THEMES } from "../../../videoTheme/makeVideoThemeLibraryFromDocuments/makeVideoThemeLibraryFromDocuments";
import { createContinuityPlanFromOptions } from "../../continuityAppearance/continuityAppearance";
import { ContinuityTimeline } from "../../ContinuityTimeline/ContinuityTimeline";
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
test("a theme camera preset lengthens travel without truncating holds or modifying the plan", () => {
  const before = structuredClone(HANDOFF);
  const themed = ContinuityThemePlans.fromVideoTheme({
    plan: HANDOFF,
    theme: _classicWithCamera("deliberate"),
  });
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
  PRESETS.forEach((preset) => {
    const themed = ContinuityThemePlans.fromVideoTheme({
      plan: HANDOFF,
      theme: _classicWithCamera(preset),
    });
    assert.deepEqual(
      _cameraPoses({ plan: themed }),
      _cameraPoses({
        plan: themed,
        options: { preset },
      }),
      preset,
    );
  });
});
test("every catalog film stays valid with every theme camera preset, which camera motion off ignores", () => {
  PLANS.forEach(({ id, plan }) => {
    const still = createContinuityPlanFromOptions({
      plan,
      raw: {
        cameraMotion: false,
      },
    });
    PRESETS.forEach((preset) => {
      const result = storyboardSchema.safeParse(
        ContinuityThemePlans.fromVideoTheme({
          plan,
          theme: _classicWithCamera(preset),
        }),
      );
      assert.equal(
        result.success,
        true,
        `${id}: ${preset}: ${result.error?.message}`,
      );
      assert.deepEqual(
        ContinuityThemePlans.fromVideoTheme({
          plan: still,
          theme: _classicWithCamera(preset),
        }),
        ContinuityThemePlans.fromVideoTheme({
          plan: still,
          theme: CLASSIC,
        }),
        `${id}: ${preset}`,
      );
    });
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
test("a theme's default camera speed retimes continuity beats the way they render", () => {
  [0.15, 0.6, 1.5].forEach((brisk) => {
    const theme = _classicWith({
      other: { video: { atomic: { cameraSpeed: { brisk } } } },
    });
    const settings = MotionSettings.makeMotionSettingsThemeFromVideoTheme({
      theme,
    });
    PLANS.forEach(({ id, plan }) => {
      const themed = ContinuityThemePlans.fromVideoTheme({
        plan,
        theme,
      });
      const authored = _renderedBeatSchedules({ plan });
      _renderedBeatSchedules({ plan: themed, settings }).forEach(
        ({ shot, holds, end }, index) => {
          const label = `${id}: ${shot.id} at ${brisk}`;
          const props = shot.scene === "continuity" ? shot.props : undefined;
          const timeline = ContinuityTimeline.getContinuityTimeline(
            props?.beats ?? [],
          );
          assert.equal(timeline[timeline.length - 1].end, end, label);
          assert.equal(shot.durationInFrames, end, label);
          holds.forEach((hold, beat) => {
            assert.ok(hold >= authored[index].holds[beat], label);
          });
        },
      );
      const result = storyboardSchema.safeParse(themed);
      assert.equal(result.success, true, `${id}: ${result.error?.message}`);
    });
  });
});
test("applying the same theme twice changes nothing", () => {
  const theme = _classicWithCamera("gentle");
  const once = ContinuityThemePlans.fromVideoTheme({
    plan: HANDOFF,
    theme,
  });
  assert.deepEqual(
    ContinuityThemePlans.fromVideoTheme({
      plan: once,
      theme,
    }),
    once,
  );
});
test("the theme's zoom limit keeps every camera key inside it and inside the diagram", () => {
  const theme = _classicWith({
    other: { video: { atomic: { zoom: { max: 1.5 } } } },
  });
  assert.ok(
    _cameraKeys(HANDOFF).some((key) => {
      return key.zoom > 1.5;
    }),
  );
  PLANS.forEach(({ id, plan }) => {
    const themed = ContinuityThemePlans.fromVideoTheme({
      plan,
      theme,
    });
    assert.ok(
      _cameraKeys(themed).every((key) => {
        return key.zoom <= 1.5;
      }),
      id,
    );
    assert.equal(storyboardSchema.safeParse(themed).success, true, id);
  });
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
  assert.throws(() => {
    return ContinuityThemePlans.fromVideoTheme({
      plan: HANDOFF,
      theme: _classicWith(patch),
    });
  }, /camera\.easing\.push/);
});
