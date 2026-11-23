import type { SpringValue } from "../videoTheme.types";
import type { CSSProperties } from "react";

/** Authored rise inputs combined with resolved motion defaults. */
export type RiseOptions = {
  frame: number;
  at: number;
  defaults: MotionDefaults;
  options: ThemedEnterOptions;
};

/** Authored departure inputs combined with resolved motion defaults. */
export type LeaveOptions = {
  frame: number;
  at: number;
  defaults: MotionDefaults;
  options: ThemedEnterOptions;
};

/** Loop timing and the resolved defaults that bound its fade. */
export type LoopEnvelopeOptions = {
  frame: number;
  duration: number;
  fadeFrames: number;
  defaults: MotionDefaults;
};

/** Maps normalized animation progress onto a motion curve. */
export type EasingFunction = (progress: number) => number;

/** A resolved animation duration and its easing curve. */
export type TimedStep = Readonly<{
  duration: number;
  easing: EasingFunction;
}>;

/** The resolved motion values the themed helpers take their defaults from. */
export type MotionDefaults = Readonly<{
  press: number;
  panel: number;
  sheet: number;
  entrance: TimedStep &
    Readonly<{
      distance: number;
    }>;
  exit: TimedStep &
    Readonly<{
      distance: number;
    }>;
  emphasis: Readonly<{
    duration: number;
    spring: SpringValue;
  }>;
  reveal: TimedStep;
  dissolve: Readonly<{
    easing: EasingFunction;
  }>;
  loopFade: Readonly<{
    graphic: number;
    film: number;
  }>;
  pressDepth: number;
  caret: Readonly<{
    halfPeriod: number;
  }>;
  entranceStyle: "rise" | "fade" | "scale" | "none";
  entranceScale: number;
  stagger: Readonly<{
    list: number;
  }>;
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
    Readonly<{
      duration: number;
    }>;
  /** Whether a typing caret is lit on this frame. */
  caretOn: (frame: number) => boolean;
  /** A loop's fade from and back to its ground, on the dissolve curve. */
  loopEnvelope: (
    frame: number,
    duration: number,
    fadeFrames?: number,
  ) => number;
}>;
