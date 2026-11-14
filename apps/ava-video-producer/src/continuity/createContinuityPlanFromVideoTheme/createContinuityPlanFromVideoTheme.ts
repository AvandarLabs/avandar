import { retimeCameraTrack } from "../../motion-components/cameraTrack";
import { motionOptionsSchema } from "../../motion-components/motionSettings";
import { isCameraSafeEasing } from "../../videoTheme/cameraEasing/cameraEasing";
import { resolveVideoThemeFromSnapshot } from "../../videoTheme/videoThemeSnapshot/videoThemeSnapshot";
import { getContinuityTimeline } from "../continuityTimeline";
import type {
  MotionEasing,
  MotionOptions,
} from "../../motion-components/motionSettings";
import type { Storyboard } from "../../storyboard/schema/schema";
import type {
  EasingValue,
  ResolvedRange,
  ResolvedVideoTheme,
} from "../../videoTheme/videoTheme.types";
import type { VideoThemeSnapshot } from "../../videoTheme/videoThemeSnapshot/videoThemeSnapshot";
import type { ContinuityBeat } from "../continuitySchema";

type ThemeSemantic = ResolvedVideoTheme["semantic"];
type MotionPresetName = NonNullable<MotionOptions["preset"]>;
type ContinuityShot = Extract<
  Storyboard["shots"][number],
  { scene: "continuity" }
>;
type BeatContent = ContinuityBeat["content"];
type CameraKey = NonNullable<
  Extract<BeatContent, { kind: "stock" }>["camera"]
>[number];
type CameraCurveName = "glide" | "push" | "whip";
type CameraTheme = Readonly<{
  curves: Readonly<Record<CameraCurveName, MotionEasing>>;
  zoom: ResolvedRange;
  presetOptions: MotionOptions | undefined;
}>;

/** The stock diagram a continuity camera frames. */
const STOCK_CANVAS = { width: 960, height: 600 };
const CAMERA_CURVE_NAMES: ReadonlySet<string> = new Set([
  "glide",
  "push",
  "whip",
]);
const presetNameSchema = motionOptionsSchema.shape.preset.unwrap();

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
  preset: MotionPresetName,
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
 * Without a preset, speed and curve stay unset, so the cue keeps its
 * authored timing and its own fallback curve.
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
      : { shutterAngle: blur.shutter }),
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
  const presetName = presetNameSchema.safeParse(preset);
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
  return CAMERA_CURVE_NAMES.has(ease);
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

function _themeContent(
  content: BeatContent,
  semantic: ThemeSemantic,
  camera: CameraTheme,
  presetOptions: MotionOptions | undefined,
): BeatContent {
  if (content.kind === "composite") {
    return {
      ...content,
      diagrams: content.diagrams.map((diagram) => ({
        ...diagram,
        overlay: {
          ...diagram.overlay,
          motion: createMotionOptionsFromTheme(
            diagram.overlay.motion,
            semantic,
          ),
        },
      })),
    };
  }
  if (content.kind !== "stock") {
    return content;
  }
  const { camera: keys, cameraOptions, flight } = content;
  return {
    ...content,
    ...(keys
      ? {
          camera: keys.map((key) => _themeCameraKey(key, camera)),
          cameraOptions:
            presetOptions ??
            createMotionOptionsFromTheme(cameraOptions, semantic),
        }
      : {}),
    // A flight blurs only when its motion is authored, so absent motion stays absent.
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

/** Frames a themed camera route needs beyond the authored one, so reading holds keep their length. */
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
  const before = retimeCameraTrack(authored.camera, authored.cameraOptions);
  const after = retimeCameraTrack(themed.camera, themed.cameraOptions);
  return Math.max(0, after[after.length - 1].at - before[before.length - 1].at);
}

function _themeBeat(
  beat: ContinuityBeat,
  semantic: ThemeSemantic,
  camera: CameraTheme,
  presetOptions: MotionOptions | undefined,
): ContinuityBeat {
  const content = _themeContent(beat.content, semantic, camera, presetOptions);
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

function _themeShot(
  shot: ContinuityShot,
  semantic: ThemeSemantic,
  camera: CameraTheme,
): ContinuityShot {
  const presetOptions = shot.props.cameraMotion
    ? camera.presetOptions
    : undefined;
  const beats = shot.props.beats.map((beat) =>
    _themeBeat(beat, semantic, camera, presetOptions),
  );
  const isRetimed = beats.some(
    (beat, index) => beat.duration !== shot.props.beats[index].duration,
  );
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
    shots: plan.shots.map((shot) =>
      shot.scene === "continuity" ? _themeShot(shot, semantic, camera) : shot,
    ),
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
    resolveVideoThemeFromSnapshot(snapshot, overrideIds),
  );
}
