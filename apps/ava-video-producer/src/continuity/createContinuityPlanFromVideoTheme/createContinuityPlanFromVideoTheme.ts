import { retimeCameraTrack } from "../../motion-components/cameraTrack/cameraTrack";
import {
  OverlayCue,
  getOverlayTimings,
} from "../../motion-components/getOverlayTimings";
import { MotionSettings } from "../../motion-components/MotionSettings/MotionSettings";
import { isCameraSafeEasing } from "../../videoTheme/isCameraSafeEasing/isCameraSafeEasing";
import { makeResolvedVideoThemeFromSnapshot } from "../../videoTheme/videoThemeSnapshotHelpers/videoThemeSnapshotHelpers";
import { getContinuityTimeline } from "../continuityTimeline";
import type {
  MotionEasing,
  MotionOptions,
} from "../../motion-components/MotionSettings/MotionSettings";
import type { Storyboard } from "../../storyboard/schema/schema";
import type {
  EasingValue,
  ResolvedRange,
  ResolvedVideoTheme,
} from "../../videoTheme/videoTheme.types";
import type { VideoThemeSnapshot } from "../../videoTheme/videoThemeSnapshotHelpers/videoThemeSnapshotHelpers";
import type { ContinuityBeat } from "../continuitySchema";

type ThemeSemantic = ResolvedVideoTheme["semantic"];
type ContinuityShot = Extract<
  Storyboard["shots"][number],
  {
    scene: "continuity";
  }
>;
type BeatContent = ContinuityBeat["content"];
type CameraKey = NonNullable<
  Extract<
    BeatContent,
    {
      kind: "stock";
    }
  >["camera"]
>[number];
const CAMERA_CURVE_NAMES = ["glide", "push", "whip"] as const;
type CameraCurveName = (typeof CAMERA_CURVE_NAMES)[number];
type CameraTheme = Readonly<{
  curves: Readonly<Record<CameraCurveName, MotionEasing>>;
  zoom: ResolvedRange;
  presetOptions: MotionOptions | undefined;
}>;
/** The stock diagram a continuity camera frames. */
const STOCK_CANVAS = { width: 960, height: 600 };
/**
 * A theme curve as a camera curve. The resolver already rejects curves that
 * are not camera-safe, so the throw only guards a theme that skipped it.
 */
function _toMotionEasing(easing: EasingValue, tokenPath: string): MotionEasing {
  if (!isCameraSafeEasing(easing)) {
    throw new Error(
      `${tokenPath}: a camera curve must keep its control points between 0 and 1, or be the cubic in-out`,
    );
  }
  if ("powerInOut" in easing) {
    return "ease-in-out-cubic";
  }
  const [x1, y1, x2, y2] = easing;
  return [x1, y1, x2, y2];
}
function _presetMotionOptions(
  preset: NonNullable<MotionOptions["preset"]>,
  semantic: ThemeSemantic,
): MotionOptions {
  const camera = semantic.camera.presets[preset];
  return {
    speed: camera.speed,
    shutterAngle: camera.shutter,
    easing: _toMotionEasing(camera.easing, `camera.presets.${preset}.easing`),
  };
}
/**
 * Motion options with the theme filled in. A named preset becomes the
 * theme's speed, shutter, and curve for that preset, and every cue gets the
 * theme's blur samples and limits. Values the storyboard authored win.
 * Without a preset, the cue takes the default preset's themed speed, so a
 * timeline read without the theme still counts the frames it renders, and
 * keeps its own fallback curve.
 */
export function createMotionOptionsFromTheme(
  options: MotionOptions | undefined,
  semantic: ThemeSemantic,
): MotionOptions {
  const { preset, ...authored }: MotionOptions = options ?? {};
  const blur = semantic.motionBlur;
  return {
    ...(preset
      ? _presetMotionOptions(preset, semantic)
      : {
          speed:
            semantic.camera.presets[MotionSettings.DEFAULT_MOTION_PRESET].speed,
          shutterAngle: blur.shutter,
        }),
    samples: blur.samples,
    velocityBlurFactor: blur.velocityFactor,
    velocityBlurLimit: blur.velocityMax,
    transitionBlur: blur.transitionBlur,
    ...authored,
  };
}
/** Reads every camera token once, so a plan's shots share one conversion. */
function _cameraTheme(semantic: ThemeSemantic): CameraTheme {
  const { easing, zoom, preset } = semantic.camera;
  const presetName = MotionSettings.motionOptionsSchema.shape.preset
    .unwrap()
    .safeParse(preset);
  return {
    curves: {
      glide: _toMotionEasing(easing.glide, "camera.easing.glide"),
      push: _toMotionEasing(easing.push, "camera.easing.push"),
      whip: _toMotionEasing(easing.whip, "camera.easing.whip"),
    },
    zoom,
    presetOptions: presetName.success
      ? createMotionOptionsFromTheme({ preset: presetName.data }, semantic)
      : undefined,
  };
}
function _isCameraCurveName(ease: string): ease is CameraCurveName {
  return (CAMERA_CURVE_NAMES as readonly string[]).includes(ease);
}
/**
 * A camera key with the theme's curve for its named ease and its zoom inside
 * the theme's limits. A clamped key moves its centre just enough to keep the
 * wider or tighter view inside the diagram.
 */
function _themeCameraKey(key: CameraKey, camera: CameraTheme): CameraKey {
  const ease = key.ease;
  const curve =
    typeof ease === "string" && _isCameraCurveName(ease)
      ? camera.curves[ease]
      : ease;
  const zoom = Math.min(camera.zoom.max, Math.max(camera.zoom.min, key.zoom));
  if (zoom === key.zoom) {
    return { ...key, ease: curve };
  }
  const halfWidth = STOCK_CANVAS.width / 2 / zoom;
  const halfHeight = STOCK_CANVAS.height / 2 / zoom;
  return {
    ...key,
    ease: curve,
    zoom,
    x: Math.min(STOCK_CANVAS.width - halfWidth, Math.max(halfWidth, key.x)),
    y: Math.min(STOCK_CANVAS.height - halfHeight, Math.max(halfHeight, key.y)),
  };
}
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
  const motion = createMotionOptionsFromTheme(overlay.motion, semantic);
  let speed = motion.speed ?? 1;
  while (
    speed < MAX_MOTION_SPEED &&
    !_fitsOverlayWindow({ ...overlay, motion: { ...motion, speed } })
  ) {
    speed = Math.min(MAX_MOTION_SPEED, Math.round(speed * 105) / 100);
  }
  return { ...motion, speed };
}
function _themeCompositeContent(
  content: Extract<
    BeatContent,
    {
      kind: "composite";
    }
  >,
  semantic: ThemeSemantic,
): BeatContent {
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
    return _themeCompositeContent(content, semantic);
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
            return _themeCameraKey(key, camera);
          }),
          cameraOptions:
            presetOptions ??
            createMotionOptionsFromTheme(cameraOptions, semantic),
        }
      : {}),
    // A flight blurs only when its motion is authored, so absent motion stays
    // absent.
    ...(flight?.motion
      ? {
          flight: {
            ...flight,
            motion: createMotionOptionsFromTheme(flight.motion, semantic),
          },
        }
      : {}),
  };
}
/**
 * Frames a themed camera route needs beyond the authored one, so reading holds
 * keep their length.
 */
function _addedCameraFrames(
  authored: BeatContent,
  themed: BeatContent,
): number {
  if (
    authored.kind !== "stock" ||
    themed.kind !== "stock" ||
    !authored.camera?.length ||
    !themed.camera?.length
  ) {
    return 0;
  }
  const before = retimeCameraTrack({
    keys: authored.camera,
    options: authored.cameraOptions,
  });
  const after = retimeCameraTrack({
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
    duration: beat.duration + _addedCameraFrames(beat.content, content),
    transition: {
      ...beat.transition,
      motion: createMotionOptionsFromTheme(beat.transition.motion, semantic),
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
function _themeShot(
  shot: ContinuityShot,
  semantic: ThemeSemantic,
  camera: CameraTheme,
): ContinuityShot {
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
  const timeline = getContinuityTimeline(beats);
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
export function createContinuityPlanFromVideoTheme(
  plan: Storyboard,
  theme: Pick<ResolvedVideoTheme, "semantic">,
): Storyboard {
  const { semantic } = theme;
  const camera = _cameraTheme(semantic);
  return {
    ...plan,
    shots: plan.shots.map((shot) => {
      return shot.scene === "continuity"
        ? _themeShot(shot, semantic, camera)
        : shot;
    }),
  };
}
/**
 * `createContinuityPlanFromVideoTheme` with a snapshot's theme, resolved for
 * `overrideIds` (the film or plan id). Use it wherever a themed film's frames
 * are counted, so the count matches the picture.
 */
export function createContinuityPlanFromVideoThemeSnapshot(
  plan: Storyboard,
  snapshot: VideoThemeSnapshot | undefined,
  overrideIds: readonly string[],
): Storyboard {
  return createContinuityPlanFromVideoTheme(
    plan,
    makeResolvedVideoThemeFromSnapshot(snapshot, overrideIds),
  );
}
