import type {
  EasingValue,
  ResolvedVideoSemantic,
  SpringValue,
} from "../videoTheme.types";
import type { ThemedMotionHelpers } from "./makeThemedMotionHelpersFromDefaults.types.ts";

/** Maps normalized animation progress onto a motion curve. */
export type EasingFunction = (progress: number) => number;

/** The semantic motion token group used to resolve renderer motion. */
export type MotionTokens = ResolvedVideoSemantic["motion"];

/** A resolved animation duration and its easing curve. */
export type TimedStep = Readonly<{
  duration: number;
  easing: EasingFunction;
}>;

/**
 * Motion a renderer can use directly: durations and staggers already divided
 * by the tempo, easing tokens turned into functions, and the `motion.ts`
 * helpers (`ramp`, `enter`, `leave`, `pop`, `press`, `reveal`, `count`,
 * `caretOn`, `loopEnvelope`) with the theme's defaults in place of their
 * literals. Cue frames and loop periods stay as authored, so a stock loop
 * stays seamless at any tempo.
 */
export type VideoMotion = Readonly<{
  tempo: number;
  /**
   * Divides an authored animation length by the tempo. Never use it on a cue
   * frame.
   */
  scale: (frames: number) => number;
  /**
   * Divides an authored stagger by the tempo and multiplies it by
   * `motion.staggerScale`, so a preset's own stagger follows the Stagger
   * option like `stagger.list` does.
   */
  scaleStagger: (frames: number) => number;
  curve: (easing: EasingValue) => EasingFunction;
  chip: number;
  whip: number;
  panel: number;
  sheet: number;
  word: number;
  hero: number;
  entrance: Readonly<{
    duration: number;
    easing: EasingFunction;
    distance: number;
  }>;
  exit: Readonly<{
    duration: number;
    easing: EasingFunction;
    distance: number;
  }>;
  drawOn: TimedStep;
  travel: Readonly<{
    easing: EasingFunction;
  }>;
  emphasis: Readonly<{
    duration: number;
    spring: SpringValue;
  }>;
  rise: TimedStep &
    Readonly<{
      stagger: number;
    }>;
  depart: TimedStep;
  surge: Readonly<{
    easing: EasingFunction;
  }>;
  dissolve: Readonly<{
    easing: EasingFunction;
  }>;
  /** Loop fades bound a loop, so tempo never changes them. */
  loopFade: Readonly<{
    graphic: number;
    film: number;
  }>;
  pressDepth: number;
  caret: Readonly<{
    halfPeriod: number;
  }>;
  entranceStyle: MotionTokens["entranceStyle"];
  entranceScale: number;
  pulse: Readonly<{
    period: number;
  }>;
  drift: Readonly<{
    distance: number;
  }>;
  packetFlow: Readonly<{
    period: number;
  }>;
  typing: Readonly<{
    rate: number;
  }>;
  stagger: Readonly<{
    list: number;
    edge: number;
    column: number;
  }>;
}> &
  ThemedMotionHelpers;
