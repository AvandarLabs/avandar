/*
 * Portable frame-based motion for individual elements in product demo films.
 * This established public entry keeps legacy exports for copied/private films.
 * Maintained app code uses Motion. Keep this file free of runtime imports.
 */
import type { CSSProperties } from "react";

type Easing = (progress: number) => number;
type FrameCue = { frame: number; at: number };
type RampParameters = FrameCue & { dur?: number; easing?: Easing };
type BlendParameters<Value> = { t: number; from: Value; to: Value };
type BezierParameters = { x1: number; y1: number; x2: number; y2: number };
type SpringConfig = { damping: number; stiffness: number; mass: number };
type EntranceOptions = {
  /** Frames the entrance takes. Defaults to DUR.panel. */
  dur?: number;
  /** Pixels travelled. Positive rises from below, negative drops from above. */
  y?: number;
  /** Horizontal travel, for something arriving from a rail. */
  x?: number;
  /** Starting scale. Never 0: nothing appears from nothing. */
  scale?: number;
  easing?: Easing;
};
type EntranceParameters = FrameCue & { opts?: EntranceOptions };
type PopParameters = FrameCue & {
  config?: Partial<SpringConfig>;
  durationInFrames?: number;
};
type LoopParameters = { frame: number; period: number; offset?: number };

/** Mirrors Root's frame rate without introducing its composition cycle. */
const FPS = 30;

function _getCubicFromPoints({
  first,
  second,
}: Readonly<{ first: number; second: number }>) {
  const linear = 3 * first;
  const quadratic = 3 * (second - first) - linear;
  const cubic = 1 - linear - quadratic;
  return {
    value: (progress: number) => {
      return ((cubic * progress + quadratic) * progress + linear) * progress;
    },
    slope: (progress: number) => {
      return (3 * cubic * progress + 2 * quadratic) * progress + linear;
    },
  };
}

function _getProgressFromBezierInput({
  input,
  curve,
}: Readonly<{
  input: number;
  curve: ReturnType<typeof _getCubicFromPoints>;
}>): number {
  let progress = input;
  for (let iteration = 0; iteration < 8; iteration++) {
    const error = curve.value(progress) - input;
    if (Math.abs(error) < 1e-6) {
      return progress;
    }
    const derivative = curve.slope(progress);
    if (Math.abs(derivative) < 1e-6) {
      break;
    }
    progress -= error / derivative;
  }
  let lowerBound = 0;
  let upperBound = 1;
  progress = input;
  while (upperBound - lowerBound > 1e-6) {
    if (curve.value(progress) < input) {
      lowerBound = progress;
    } else {
      upperBound = progress;
    }
    progress = (lowerBound + upperBound) / 2;
  }
  return progress;
}

/** CSS cubic-bezier easing with clamped endpoints and interior overshoot. */
function _bezier({ x1, y1, x2, y2 }: Readonly<BezierParameters>): Easing {
  const inputCurve = _getCubicFromPoints({ first: x1, second: x2 });
  const outputCurve = _getCubicFromPoints({ first: y1, second: y2 });
  return (input) => {
    if (input <= 0) {
      return 0;
    }
    if (input >= 1) {
      return 1;
    }
    return outputCurve.value(
      _getProgressFromBezierInput({ input, curve: inputCurve }),
    );
  };
}

/**
 * Product CSS curves. Arrivals ease out, departures in, visible travel in-out.
 */
export const EASE = {
  /** ease-out-expo for entrances and responsive feedback. */
  out: _bezier({ x1: 0.16, y1: 1, x2: 0.3, y2: 1 }),
  /** One restrained overshoot for an element landing in its slot. */
  outBack: _bezier({ x1: 0.34, y1: 1.56, x2: 0.64, y2: 1 }),
  /** Symmetric travel for something already visible. */
  inOut: _bezier({ x1: 0.45, y1: 0, x2: 0.55, y2: 1 }),
  /** Symmetric cubic for a cursor travelling between targets. */
  inOutCubic: (progress: number) => {
    return progress < 0.5
      ? 4 * progress * progress * progress
      : 1 - (-2 * progress + 2) ** 3 / 2;
  },
  /** Masked words, staged fades, growing bars, and rising columns. */
  word: _bezier({ x1: 0.22, y1: 1, x2: 0.36, y2: 1 }),
  /** Accelerating departures. Never for an arrival. */
  in: _bezier({ x1: 0.55, y1: 0, x2: 1, y2: 0.45 }),
  /** Fly-through travel that lingers, surges, then settles before the cut. */
  surge: _bezier({ x1: 0.7, y1: 0, x2: 0.2, y2: 1 }),
} as const;

/** Explanatory product-demo durations, in frames at 30 fps. */
export const DUR = {
  /** 133 ms: a press answering back. */
  press: 4,
  /** 200 ms: a chip changing state. */
  chip: 6,
  /** 300 ms: a row, card, or panel arriving. */
  panel: 9,
  /** 433 ms: a sheet or full column. */
  sheet: 13,
  /** 600 ms: one hero beat. */
  hero: 18,
  /** 500 ms: one word rising out of its mask. */
  word: 15,
  /** 267 ms: a whip-out or column wipe, shorter than the entrance. */
  whip: 8,
} as const;
/** Frames between list siblings: about 67 ms, avoiding a pasted-in group. */
export const STAGGER = 2;
/**
 * Fractional frames between wipe columns, preserving sub-frame interpolation.
 */
export const STAGGER_COLUMN = 0.5;

function _oscillator({
  time,
  config: { damping, stiffness, mass },
}: Readonly<{
  time: number;
  config: SpringConfig;
}>): number {
  const frequency = Math.sqrt(stiffness / mass);
  const dampingRatio = damping / (2 * Math.sqrt(stiffness * mass));
  if (dampingRatio < 1) {
    const dampedFrequency =
      frequency * Math.sqrt(1 - dampingRatio * dampingRatio);
    return (
      1 -
      Math.exp(-dampingRatio * frequency * time) *
        (Math.cos(dampedFrequency * time) +
          ((dampingRatio * frequency) / dampedFrequency) *
            Math.sin(dampedFrequency * time))
    );
  }
  return 1 - Math.exp(-frequency * time) * (1 + frequency * time);
}

function _getSettleTimeFromSpring(config: Readonly<SpringConfig>): number {
  const { damping, stiffness, mass } = config;
  const frequency = Math.sqrt(stiffness / mass);
  const dampingRatio = damping / (2 * Math.sqrt(stiffness * mass));
  const decay = dampingRatio < 1 ? dampingRatio * frequency : frequency;
  const dampedFrequency =
    dampingRatio < 1
      ? frequency * Math.sqrt(1 - dampingRatio * dampingRatio)
      : frequency;
  const amplitude =
    dampingRatio < 1
      ? Math.sqrt(1 + ((dampingRatio * frequency) / dampedFrequency) ** 2)
      : 2;
  return Math.max(1e-3, -Math.log(1e-3 / amplitude) / decay);
}

/** Stateless, portable frame math shared by compositions and themed motion. */
export const Motion = {
  /** CSS cubic-bezier curve with exact 0 and 1 endpoints. */
  bezier: _bezier,
  /** Clamped progress across the cue window, with optional easing overshoot. */
  ramp: (options: Readonly<RampParameters>): number => {
    const { frame, at, dur = DUR.panel, easing = EASE.out } = options;
    if (at + dur === at) {
      return 1;
    }
    return (
      0 +
      (1 - 0) * easing(Math.min(1, Math.max(0, (frame - at) / (at + dur - at))))
    );
  },
  /** Numeric interpolation without clamping the supplied progress. */
  mix: (options: Readonly<BlendParameters<number>>): number => {
    const { t, from, to } = options;
    return from + (to - from) * t;
  },
  /** OKLab token interpolation, clamped and rounded to whole percentages. */
  mixToken: (options: Readonly<BlendParameters<string>>): string => {
    const { t, from, to } = options;
    const percentage = Math.round(Math.min(1, Math.max(0, t)) * 100);
    return `color-mix(in oklab, ${to} ${percentage}%, ${from})`;
  },
  /** Composited entrance opacity, translation, and optional starting scale. */
  enter: (options: Readonly<EntranceParameters>): CSSProperties => {
    const { frame, at, opts = {} } = options;
    const {
      dur = DUR.panel,
      y = 12,
      x = 0,
      scale = 1,
      easing = EASE.out,
    } = opts;
    const progress = Motion.ramp({ frame, at, dur, easing });
    const transforms = [
      `translate(${Motion.mix({ t: progress, from: x, to: 0 }).toFixed(2)}px, ${Motion.mix({ t: progress, from: y, to: 0 }).toFixed(2)}px)`,
    ];
    if (scale !== 1) {
      transforms.push(
        `scale(${Motion.mix({ t: progress, from: scale, to: 1 }).toFixed(4)})`,
      );
    }
    return { opacity: progress, transform: transforms.join(" ") };
  },
  /** Entrance delayed by the sibling index times STAGGER. */
  enterAt: (
    options: Readonly<EntranceParameters & { index: number }>,
  ): CSSProperties => {
    const { frame, at, index, opts = {} } = options;
    return Motion.enter({ frame, at: at + index * STAGGER, opts });
  },
  /** Fade and translate away from rest. The shared scale option is ignored. */
  leave: (options: Readonly<EntranceParameters>): CSSProperties => {
    const { frame, at, opts = {} } = options;
    const { dur = DUR.chip, y = 12, x = 0, easing = EASE.out } = opts;
    const progress = Motion.ramp({ frame, at, dur, easing });
    return {
      opacity: 1 - progress,
      transform: `translate(${Motion.mix({ t: progress, from: 0, to: x }).toFixed(2)}px, ${Motion.mix({ t: progress, from: 0, to: y }).toFixed(2)}px)`,
    };
  },
  /** Frame-anchored analytical spring, fitted to its requested duration. */
  pop: (options: Readonly<PopParameters>): number => {
    const { frame, at, config = {}, durationInFrames = DUR.sheet } = options;
    const springConfig = { damping: 14, stiffness: 120, mass: 0.8, ...config };
    const elapsed = frame - at;
    if (elapsed <= 0) {
      return 0;
    }
    if (elapsed >= durationInFrames) {
      return 1;
    }
    const time =
      (elapsed / durationInFrames) * _getSettleTimeFromSpring(springConfig);
    return _oscillator({ time, config: springConfig });
  },
  /**
   * Bell-shaped press returning to exactly 1 outside its eight-frame window.
   */
  press: (options: Readonly<FrameCue & { depth?: number }>): number => {
    const { frame, at, depth = 0.04 } = options;
    const duration = DUR.press * 2;
    if (frame < at || frame >= at + duration) {
      return 1;
    }
    const progress = (frame - at) / (duration - 1);
    return 1 - depth * Math.sin(Math.PI * progress);
  },
  /** Rounded counter rising from zero to its final value. */
  countTo: (
    options: Readonly<FrameCue & { to: number; dur?: number }>,
  ): number => {
    const { frame, at, to, dur = DUR.sheet } = options;
    const progress = Motion.ramp({ frame, at, dur, easing: EASE.out });
    return Math.round(0 + (to - 0) * progress);
  },
  /** Caret visibility alternating every half-second. */
  caretOn: (frame: number): boolean => {
    return Math.floor(frame / (FPS / 2)) % 2 === 0;
  },
  /** Text revealed at a character rate, empty at and before its cue. */
  typed: (
    options: Readonly<FrameCue & { text: string; cps?: number }>,
  ): string => {
    const { frame, at, text, cps = 28 } = options;
    if (frame <= at) {
      return "";
    }
    return text.slice(0, Math.floor(((frame - at) / FPS) * cps));
  },
  /**
   * Periodic progress, deterministic for positive and negative frame offsets.
   */
  loopPhase: (options: Readonly<LoopParameters>): number => {
    const { frame, period, offset = 0 } = options;
    if (![frame, period, offset].every(Number.isFinite) || period <= 0) {
      throw new Error(
        "Loop timing requires finite frames and a positive period",
      );
    }
    return ((((frame - offset) % period) + period) % period) / period;
  },
  /** Smooth 0..1..0 ambient pulse without an abrupt reset. */
  wave: (options: Readonly<LoopParameters>): number => {
    const { frame, period, offset = 0 } = options;
    return (
      (1 -
        Math.cos(Motion.loopPhase({ frame, period, offset }) * Math.PI * 2)) /
      2
    );
  },
  /** Fade to and from the same ground on both boundary frames of a loop. */
  loopEnvelope: (
    options: Readonly<{
      frame: number;
      duration: number;
      fadeFrames?: number;
    }>,
  ): number => {
    const { frame, duration, fadeFrames = 12 } = options;
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
    return (
      Motion.ramp({ frame, at: 0, dur: fadeFrames, easing: EASE.inOut }) *
      (1 -
        Motion.ramp({
          frame,
          at: duration - 1 - fadeFrames,
          dur: fadeFrames,
          easing: EASE.inOut,
        }))
    );
  },
};

function _hasLegacyArguments<
  Options extends object,
  Arguments extends [number, ...unknown[]],
>(values: [Readonly<Options>] | Arguments): values is Arguments {
  return typeof values[0] === "number";
}

function _withLegacyArguments<
  Options extends object,
  Arguments extends [number, ...unknown[]],
  Result,
>({
  named,
  positional,
}: {
  named: (options: Readonly<Options>) => Result;
  positional: (...values: Arguments) => Result;
}): (...values: [Readonly<Options>] | Arguments) => Result {
  return (...values) => {
    return _hasLegacyArguments(values)
      ? positional(...values)
      : named(values[0]);
  };
}
/** Compatibility with positional and named easing calls in existing films. */
export const bezier = _withLegacyArguments({
  named: Motion.bezier,
  positional: (x1: number, y1: number, x2: number, y2: number) => {
    return Motion.bezier({ x1, y1, x2, y2 });
  },
});
/** Compatibility with positional and named progress calls in existing films. */
export const ramp = _withLegacyArguments({
  named: Motion.ramp,
  positional: (frame: number, at: number, dur?: number, easing?: Easing) => {
    return Motion.ramp({ frame, at, dur, easing });
  },
});
/** Compatibility with positional and named numeric blends in existing films. */
export const mix = _withLegacyArguments({
  named: Motion.mix,
  positional: (t: number, from: number, to: number) => {
    return Motion.mix({ t, from, to });
  },
});
/** Compatibility with positional and named token blends in existing films. */
export const mixToken = _withLegacyArguments({
  named: Motion.mixToken,
  positional: (t: number, from: string, to: string) => {
    return Motion.mixToken({ t, from, to });
  },
});
/** Compatibility with positional and named entrances in existing films. */
export const enter = _withLegacyArguments({
  named: Motion.enter,
  positional: (frame: number, at: number, opts?: EntranceOptions) => {
    return Motion.enter({ frame, at, opts });
  },
});
/** Compatibility with positional and named staggered entrances in films. */
export const enterAt = _withLegacyArguments({
  named: Motion.enterAt,
  positional: (
    frame: number,
    at: number,
    index: number,
    opts?: EntranceOptions,
  ) => {
    return Motion.enterAt({ frame, at, index, opts });
  },
});
/** Compatibility with positional and named departures in existing films. */
export const leave = _withLegacyArguments({
  named: Motion.leave,
  positional: (frame: number, at: number, opts?: EntranceOptions) => {
    return Motion.leave({ frame, at, opts });
  },
});
/** Compatibility with positional and named spring calls in existing films. */
export const pop = _withLegacyArguments({
  named: Motion.pop,
  positional: (
    frame: number,
    at: number,
    config?: Partial<SpringConfig>,
    durationInFrames?: number,
  ) => {
    return Motion.pop({ frame, at, config, durationInFrames });
  },
});
/** Compatibility with positional and named press calls in existing films. */
export const press = _withLegacyArguments({
  named: Motion.press,
  positional: (frame: number, at: number, depth?: number) => {
    return Motion.press({ frame, at, depth });
  },
});
/** Compatibility with positional and named counters in existing films. */
export const countTo = _withLegacyArguments({
  named: Motion.countTo,
  positional: (frame: number, at: number, to: number, dur?: number) => {
    return Motion.countTo({ frame, at, to, dur });
  },
});
/** Existing frame-only caret API. */
export const caretOn = Motion.caretOn;
/** Compatibility with positional and named typing calls in existing films. */
export const typed = _withLegacyArguments({
  named: Motion.typed,
  positional: (frame: number, at: number, text: string, cps?: number) => {
    return Motion.typed({ frame, at, text, cps });
  },
});
/** Compatibility with positional and named periodic progress in films. */
export const loopPhase = _withLegacyArguments({
  named: Motion.loopPhase,
  positional: (frame: number, period: number, offset?: number) => {
    return Motion.loopPhase({ frame, period, offset });
  },
});
/** Compatibility with positional and named periodic pulses in films. */
export const wave = _withLegacyArguments({
  named: Motion.wave,
  positional: (frame: number, period: number, offset?: number) => {
    return Motion.wave({ frame, period, offset });
  },
});
/** Compatibility with positional and named loop envelopes in films. */
export const loopEnvelope = _withLegacyArguments({
  named: Motion.loopEnvelope,
  positional: (frame: number, duration: number, fadeFrames?: number) => {
    return Motion.loopEnvelope({ frame, duration, fadeFrames });
  },
});
