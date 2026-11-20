import { z } from "zod";
import { StageTheme } from "../../../scenes/StageTheme/StageTheme";
import { STEPPED_COLUMN_WIPE_DEFAULTS } from "../../StoryFilm/steppedColumnWipe/steppedColumnWipe";
import { shotSchema } from "../shotSchema";
import { type TiltedWindowProps } from "./StoryboardValidation.types";
/** Explains why a shot's transition object cannot render as authored. */
function _checkShotTransition({
  shot,
  isFirstShot,
}: Readonly<{
  shot: z.infer<typeof shotSchema>;
  isFirstShot: boolean;
}>): string[] {
  const { transition } = shot;
  if (!transition) {
    return [];
  }
  if (isFirstShot) {
    return [`${shot.id}: the first shot has nothing to transition from`];
  }
  if (transition.kind === "cut") {
    return shot.transitionInFrames === 0
      ? []
      : [`${shot.id}: a cut needs transitionInFrames set to 0`];
  }
  if (shot.transitionInFrames === 0) {
    return [`${shot.id}: a transition needs transitionInFrames above 0`];
  }
  if (transition.kind === "stepped-column-wipe") {
    const columns = transition.columns ?? STEPPED_COLUMN_WIPE_DEFAULTS.columns;
    // An omitted stagger is the theme's; plans are checked against `classic`.
    const stagger =
      transition.staggerFrames ??
      StageTheme.getClassicStageMotion().stagger.column;
    if (stagger * (columns - 1) >= shot.transitionInFrames) {
      return [
        `${shot.id}: the last wipe column starts after the transition ends; lower columns or staggerFrames`,
      ];
    }
  }
  return [];
}
/** Explains why a tilted-window shot cannot render as authored. */
function _checkTiltedWindow({
  props,
  durationInFrames,
}: Readonly<{
  props: TiltedWindowProps;
  durationInFrames: number;
}>): string[] {
  const isPair = props.layout === "pair";
  const windows = props.windows ?? [];
  const isIncreasing = (frames: number[]) => {
    return frames.every((value, index) => {
      return index === 0 || value > frames[index - 1];
    });
  };
  return [
    isPair && !props.pair ? "the pair layout needs pair columns" : "",
    isPair && props.windows ? "the pair layout takes pair, not windows" : "",
    !isPair && !windows.length ? "a single window layout needs windows" : "",
    !isPair &&
    (props.enter?.kind === "flip-split" || props.enter?.kind === "from-sides")
      ? `${props.enter.kind} enters the pair layout only`
      : "",
    windows[0]?.atFrame !== undefined
      ? "the first window is on screen from the start; omit its atFrame"
      : "",
    windows.slice(1).some((window) => {
      return window.atFrame === undefined;
    }) ||
    !isIncreasing(
      windows.slice(1).map((window) => {
        return window.atFrame ?? 0;
      }),
    )
      ? "carousel windows need increasing atFrame values"
      : "",
    !isIncreasing(
      (props.headlines ?? []).map((headline) => {
        return headline.atFrame;
      }),
    )
      ? "headlines need increasing atFrame values"
      : "",
    props.camera &&
    !isIncreasing(
      props.camera.map((key) => {
        return key.at;
      }),
    )
      ? "camera keys need increasing frames"
      : "",
    (props.pair ?? []).some((column) => {
      return column.counter.endFrame <= column.counter.startFrame;
    })
      ? "a counter must end after it starts"
      : "",
    props.exit && props.exit.atFrame >= durationInFrames
      ? "the exit must start inside the shot"
      : "",
  ].filter(Boolean);
}
/** Validates authored shot transitions and tilted-window schedules. */
export const StoryboardValidation = {
  /** Explains why a shot transition cannot render as authored. */
  checkShotTransition: _checkShotTransition,
  /** Explains why a tilted-window schedule cannot render as authored. */
  checkTiltedWindow: _checkTiltedWindow,
} as const;
