import { CameraTrack } from "../../motion-components/CameraTrack/CameraTrack";
import { getOverlayTimings } from "../../motion-components/getOverlayTimings";
import { MotionSettings } from "../../motion-components/MotionSettings/MotionSettings";
import { ContinuityTimeline } from "../ContinuityTimeline/ContinuityTimeline";
import { _fromVideoThemeSnapshot } from "./_fromVideoThemeSnapshot";
import { _makeMotionOptionsFromTheme } from "./_makeMotionOptionsFromTheme";
import {
  createCameraThemeFromSemantic,
  createCameraKeyFromTheme,
} from "./continuityCameraThemeHelpers";
import type { OverlayCue } from "../../motion-components/getOverlayTimings";
import type { MotionOptions } from "../../motion-components/MotionSettings/MotionSettings";
import type { Storyboard } from "../../storyboard/schema/schema";
import type { ResolvedVideoTheme } from "../../videoTheme/videoTheme.types";
import type { ContinuityBeat } from "../continuitySchema/continuitySchema";
import type {
  ThemeSemantic,
  ContinuityShot,
  BeatContent,
  CameraTheme,
} from "./ContinuityThemePlans.types";
/** The fastest speed a motion cue may take. */
const MAX_MOTION_SPEED = 4;
function _fitsOverlayWindow(cue: OverlayCue): boolean {
  try {
    getOverlayTimings({ cue });
    return true;
  } catch {
    return false;
  }
}
/**
 * Overlay motion with the theme filled in, sped up just enough that its
 * travel still leaves a reading hold inside the authored window when the
 * theme's speed is too slow for it. The plan's beats keep their content
 * timing, so the window cannot grow instead.
 */
function _themeOverlayMotion({
  overlay,
  semantic,
}: Readonly<{
  overlay: OverlayCue;
  semantic: ThemeSemantic;
}>): MotionOptions {
  const motion = _makeMotionOptionsFromTheme({
    options: overlay.motion,
    semantic,
  });
  let speed = motion.speed ?? 1;
  while (
    speed < MAX_MOTION_SPEED &&
    !_fitsOverlayWindow({ ...overlay, motion: { ...motion, speed } })
  ) {
    speed = Math.min(MAX_MOTION_SPEED, Math.round(speed * 105) / 100);
  }
  return { ...motion, speed };
}
function _themeCompositeContent({
  content,
  semantic,
}: Readonly<{
  content: Extract<
    BeatContent,
    {
      kind: "composite";
    }
  >;
  semantic: ThemeSemantic;
}>): BeatContent {
  return {
    ...content,
    diagrams: content.diagrams.map((diagram) => {
      return {
        ...diagram,
        overlay: {
          ...diagram.overlay,
          motion: _themeOverlayMotion({ overlay: diagram.overlay, semantic }),
        },
      };
    }),
  };
}
type ThemeContentOptions = {
  content: BeatContent;
  semantic: ThemeSemantic;
  camera: CameraTheme;
  presetOptions: MotionOptions | undefined;
};
function _themeContent(options: ThemeContentOptions): BeatContent {
  const { content, semantic, camera, presetOptions } = options;
  if (content.kind === "composite") {
    return _themeCompositeContent({
      content,
      semantic,
    });
  }
  if (content.kind !== "stock") {
    return content;
  }
  const { camera: keys, cameraOptions, flight } = content;
  return {
    ...content,
    ...(keys
      ? {
          camera: keys.map((key) => {
            return createCameraKeyFromTheme({
              key,
              camera,
            });
          }),
          cameraOptions:
            presetOptions ??
            _makeMotionOptionsFromTheme({
              options: cameraOptions,
              semantic,
            }),
        }
      : {}),
    // A flight blurs only when its motion is authored, so absent motion stays
    // absent.
    ...(flight?.motion
      ? {
          flight: {
            ...flight,
            motion: _makeMotionOptionsFromTheme({
              options: flight.motion,
              semantic,
            }),
          },
        }
      : {}),
  };
}
/**
 * Frames a themed camera route needs beyond the authored one, so reading holds
 * keep their length.
 */
function _addedCameraFrames({
  authored,
  themed,
}: Readonly<{
  authored: BeatContent;
  themed: BeatContent;
}>): number {
  if (
    authored.kind !== "stock" ||
    themed.kind !== "stock" ||
    !authored.camera?.length ||
    !themed.camera?.length
  ) {
    return 0;
  }
  const before = CameraTrack.retime({
    keys: authored.camera,
    options: authored.cameraOptions,
  });
  const after = CameraTrack.retime({
    keys: themed.camera,
    options: themed.cameraOptions,
  });
  return Math.max(0, after[after.length - 1].at - before[before.length - 1].at);
}
type ThemeBeatOptions = {
  beat: ContinuityBeat;
  semantic: ThemeSemantic;
  camera: CameraTheme;
  presetOptions: MotionOptions | undefined;
};
function _themeBeat(options: ThemeBeatOptions): ContinuityBeat {
  const { beat, semantic, camera, presetOptions } = options;
  const content = _themeContent({
    content: beat.content,
    semantic,
    camera,
    presetOptions,
  });
  return {
    ...beat,
    duration:
      beat.duration +
      _addedCameraFrames({
        authored: beat.content,
        themed: content,
      }),
    transition: {
      ...beat.transition,
      motion: _makeMotionOptionsFromTheme({
        options: beat.transition.motion,
        semantic,
      }),
    },
    content,
  };
}
/** Each beat's incoming overlap in frames. The first beat has none. */
function _overlapFrames(beats: readonly ContinuityBeat[]): number[] {
  return beats.map((beat, index) => {
    return index === 0
      ? 0
      : MotionSettings.getMotionDuration({
          frames: beat.transition.frames,
          options: beat.transition.motion,
        });
  });
}
/**
 * The beats with each one lengthened by what its themed overlaps gained, so
 * the reading hold between its incoming and outgoing overlap keeps its
 * length. A shorter overlap leaves the beat as it is.
 */
function _keepReadingHolds({
  authored,
  themed,
}: Readonly<{
  authored: readonly ContinuityBeat[];
  themed: readonly ContinuityBeat[];
}>): ContinuityBeat[] {
  const before = _overlapFrames(authored);
  const after = _overlapFrames(themed);
  return themed.map((beat, index) => {
    const gained =
      after[index] -
      before[index] +
      (after[index + 1] ?? 0) -
      (before[index + 1] ?? 0);
    return { ...beat, duration: beat.duration + Math.max(0, gained) };
  });
}
function _themeShot({
  shot,
  semantic,
  camera,
}: Readonly<{
  shot: ContinuityShot;
  semantic: ThemeSemantic;
  camera: CameraTheme;
}>): ContinuityShot {
  const presetOptions = shot.props.cameraMotion
    ? camera.presetOptions
    : undefined;
  const authored = shot.props.beats;
  const beats = _keepReadingHolds({
    authored,
    themed: authored.map((beat) => {
      return _themeBeat({ beat, semantic, camera, presetOptions });
    }),
  });
  const overlaps = _overlapFrames(authored);
  const themedOverlaps = _overlapFrames(beats);
  const isRetimed = beats.some((beat, index) => {
    return (
      beat.duration !== authored[index].duration ||
      themedOverlaps[index] !== overlaps[index]
    );
  });
  if (!isRetimed) {
    return { ...shot, props: { ...shot.props, beats } };
  }
  const timeline = ContinuityTimeline.getContinuityTimeline(beats);
  return {
    ...shot,
    durationInFrames: timeline[timeline.length - 1].end,
    props: { ...shot.props, beats },
  };
}
/**
 * A storyboard with its continuity shots fitted to a video theme. The
 * theme's camera preset retimes camera travel where camera motion is on,
 * authored motion presets take the theme's speed, shutter, and curve, camera
 * curves and zoom limits come from the theme, and every motion cue gets the
 * theme's blur settings. Reading holds keep their length, other shots are
 * returned as they are, and the plan is not modified. Applying the same
 * theme twice changes nothing.
 */
function _fromVideoTheme({
  plan,
  theme,
}: Readonly<{
  plan: Storyboard;
  theme: Pick<ResolvedVideoTheme, "semantic">;
}>): Storyboard {
  const { semantic } = theme;
  const camera = createCameraThemeFromSemantic(semantic);
  return {
    ...plan,
    shots: plan.shots.map((shot) => {
      return shot.scene === "continuity"
        ? _themeShot({
            shot,
            semantic,
            camera,
          })
        : shot;
    }),
  };
}

/**
 * Applies resolved theme settings to continuity plans before playback and
 * export.
 */
export const ContinuityThemePlans = {
  /**
   * `createContinuityPlanFromVideoTheme` with a snapshot's theme, resolved for
   * `overrideIds` (the film or plan id).
   */
  fromVideoThemeSnapshot: _fromVideoThemeSnapshot,
  /** Motion options with the theme filled in. */
  makeMotionOptionsFromTheme: _makeMotionOptionsFromTheme,
  /** A storyboard with its continuity shots fitted to a video theme. */
  fromVideoTheme: _fromVideoTheme,
};
