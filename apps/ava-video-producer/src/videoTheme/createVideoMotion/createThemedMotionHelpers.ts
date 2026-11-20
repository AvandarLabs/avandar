import { isDefined } from "@avandar/utils";
import { match } from "ts-pattern";
import { mix, pop, ramp } from "../../motion";
import type { SpringValue } from "../videoTheme.types";
import type { CSSProperties } from "react";

type RiseOptions = {
  frame: number;
  at: number;
  defaults: MotionDefaults;
  options: ThemedEnterOptions;
};
type LeaveOptions = {
  frame: number;
  at: number;
  defaults: MotionDefaults;
  options: ThemedEnterOptions;
};
type LoopEnvelopeOptions = {
  frame: number;
  duration: number;
  fadeFrames: number;
  defaults: MotionDefaults;
};
type EasingFunction = (progress: number) => number;
type TimedStep = Readonly<{ duration: number; easing: EasingFunction }>;
/** The resolved motion values the themed helpers take their defaults from. */
type MotionDefaults = Readonly<{
  press: number;
  panel: number;
  sheet: number;
  entrance: TimedStep & Readonly<{ distance: number }>;
  exit: TimedStep & Readonly<{ distance: number }>;
  emphasis: Readonly<{ duration: number; spring: SpringValue }>;
  reveal: TimedStep;
  dissolve: Readonly<{ easing: EasingFunction }>;
  loopFade: Readonly<{ graphic: number; film: number }>;
  pressDepth: number;
  caret: Readonly<{ halfPeriod: number }>;
  entranceStyle: "rise" | "fade" | "scale" | "none";
  entranceScale: number;
  stagger: Readonly<{ list: number }>;
}>;
/** Options of a themed entrance or exit. Unset values come from the theme. */
export type ThemedEnterOptions = Readonly<{
  /** Frames the move takes, already tempo-scaled. */
  dur?: number;
  /** Pixels travelled. Positive rises from below, negative drops from above. */
  y?: number;
  /** Horizontal travel, for something arriving from a rail. */
  x?: number;
  /** Starting scale. Never 0. */
  scale?: number;
  easing?: EasingFunction;
}>;
/**
 * The `motion.ts` helpers with the theme's defaults in place of their
 * literals. Each helper reads the same arguments as its `motion.ts`
 * namesake, so a renderer swaps `ramp(frame, at, 12)` for
 * `motion.ramp(frame, at, motion.scale(12))` and `classic` draws the same.
 */
export type ThemedMotionHelpers = Readonly<{
  /**
   * 0 to 1 across `[at, at + duration]`. Defaults to the panel duration and
   * the reveal curve, which `classic` sets to `motion.ts`'s `ramp` defaults.
   */
  ramp: (
    frame: number,
    at: number,
    duration?: number,
    easing?: EasingFunction,
  ) => number;
  /**
   * The fade most elements use to appear on their cue: `motion.reveal`.
   * Its duration and curve are also readable as properties.
   */
  reveal: ((frame: number, at: number) => number) & TimedStep;
  /**
   * An element arriving: opacity plus the theme's entrance style (a rise, a
   * plain fade, a scale up, or a cut on the cue).
   */
  enter: (
    frame: number,
    at: number,
    options?: ThemedEnterOptions,
  ) => CSSProperties;
  /** `enter`, staggered by index with the list stagger. */
  enterAt: (
    frame: number,
    at: number,
    index: number,
    options?: ThemedEnterOptions,
  ) => CSSProperties;
  /** An element leaving the way it arrived, on the exit step. */
  leave: (
    frame: number,
    at: number,
    options?: ThemedEnterOptions,
  ) => CSSProperties;
  /**
   * A whole number counting up from 0 to `to` across `[at, at + duration]`,
   * on the entrance curve. Defaults to the sheet duration, so `classic`
   * counts like `motion.ts`'s `countTo`. Pass a tempo-scaled duration.
   */
  count: (frame: number, at: number, to: number, duration?: number) => number;
  /** A spring landing, 0 to 1, on the emphasis step. */
  pop: (frame: number, at: number, duration?: number) => number;
  /**
   * A press answering back, as a scale that returns to exactly 1. Its
   * tempo-scaled duration is readable as `press.duration`.
   */
  press: ((frame: number, at: number, depth?: number) => number) &
    Readonly<{ duration: number }>;
  /** Whether a typing caret is lit on this frame. */
  caretOn: (frame: number) => boolean;
  /** A loop's fade from and back to its ground, on the dissolve curve. */
  loopEnvelope: (
    frame: number,
    duration: number,
    fadeFrames?: number,
  ) => number;
}>;
function _rise({
  frame,
  at,
  defaults,
  options,
}: Readonly<RiseOptions>): CSSProperties {
  const {
    dur = defaults.entrance.duration,
    y = defaults.entrance.distance,
    x = 0,
    easing = defaults.entrance.easing,
  } = options;
  return match(defaults.entranceStyle)
    .with("none", () => {
      return { opacity: frame >= at ? 1 : 0 };
    })
    .with("fade", () => {
      return { opacity: ramp(frame, at, dur, easing) };
    })
    .with("rise", "scale", (entranceStyle) => {
      const progress = ramp(frame, at, dur, easing);
      const scale =
        options.scale ??
        (entranceStyle === "scale" ? defaults.entranceScale : 1);
      const travel = entranceStyle === "scale" ? { x: 0, y: 0 } : { x, y };
      const parts = [
        `translate(${mix(progress, travel.x, 0).toFixed(2)}px, ${mix(progress, travel.y, 0).toFixed(2)}px)`,
        scale !== 1
          ? `scale(${mix(progress, scale, 1).toFixed(4)})`
          : undefined,
      ].filter(isDefined);
      return { opacity: progress, transform: parts.join(" ") };
    })
    .exhaustive();
}
function _leave({
  frame,
  at,
  defaults,
  options,
}: Readonly<LeaveOptions>): CSSProperties {
  const {
    dur = defaults.exit.duration,
    y = defaults.exit.distance,
    x = 0,
    easing = defaults.exit.easing,
  } = options;
  const t = ramp(frame, at, dur, easing);
  return {
    opacity: 1 - t,
    transform: `translate(${mix(t, 0, x).toFixed(2)}px, ${mix(t, 0, y).toFixed(2)}px)`,
  };
}
/**
 * The same envelope as `motion.ts`'s `loopEnvelope`, on the theme's dissolve
 * curve instead of a fixed one.
 */
function _loopEnvelope({
  frame,
  duration,
  fadeFrames,
  defaults,
}: Readonly<LoopEnvelopeOptions>): number {
  if (
    ![frame, duration, fadeFrames].every(Number.isFinite) ||
    duration < 2 ||
    fadeFrames <= 0 ||
    fadeFrames * 2 >= duration
  ) {
    throw new Error(
      "Loop envelope requires duration > twice the positive fade length",
    );
  }
  const easing = defaults.dissolve.easing;
  return (
    ramp(frame, 0, fadeFrames, easing) *
    (1 - ramp(frame, duration - 1 - fadeFrames, fadeFrames, easing))
  );
}
function _press(defaults: MotionDefaults): ThemedMotionHelpers["press"] {
  const length = defaults.press * 2;
  const press = (frame: number, at: number, depth = defaults.pressDepth) => {
    if (frame < at || frame >= at + length) {
      return 1;
    }
    return 1 - depth * Math.sin((Math.PI * (frame - at)) / (length - 1));
  };
  return Object.assign(press, { duration: defaults.press });
}
/**
 * Builds the themed motion helpers from resolved motion values. Called by
 * `createVideoMotion`, which spreads them into `VideoMotion`.
 */
export function createThemedMotionHelpers(
  defaults: MotionDefaults,
): ThemedMotionHelpers {
  const reveal = (frame: number, at: number) => {
    return ramp(frame, at, defaults.reveal.duration, defaults.reveal.easing);
  };
  return {
    ramp: (
      frame,
      at,
      duration = defaults.panel,
      easing = defaults.reveal.easing,
    ) => {
      return ramp(frame, at, duration, easing);
    },
    reveal: Object.assign(reveal, defaults.reveal),
    enter: (frame, at, options = {}) => {
      return _rise({ frame, at, defaults, options });
    },
    enterAt: (frame, at, index, options = {}) => {
      return _rise({
        frame,
        at: at + index * defaults.stagger.list,
        defaults,
        options,
      });
    },
    leave: (frame, at, options = {}) => {
      return _leave({ frame, at, defaults, options });
    },
    count: (frame, at, to, duration = defaults.sheet) => {
      return Math.round(
        mix(ramp(frame, at, duration, defaults.entrance.easing), 0, to),
      );
    },
    pop: (frame, at, duration = defaults.emphasis.duration) => {
      return pop(frame, at, defaults.emphasis.spring, duration);
    },
    press: _press(defaults),
    caretOn: (frame) => {
      return Math.floor(frame / defaults.caret.halfPeriod) % 2 === 0;
    },
    loopEnvelope: (frame, duration, fadeFrames = defaults.loopFade.graphic) => {
      return _loopEnvelope({ frame, duration, fadeFrames, defaults });
    },
  };
}
