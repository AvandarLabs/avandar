import type {
  MotionDefaults,
  ThemedEnterOptions,
  ThemedMotionHelpers,
  RiseOptions,
  LeaveOptions,
  LoopEnvelopeOptions,
} from "./makeThemedMotionHelpersFromDefaults.types.ts";

export type {
  ThemedEnterOptions,
  ThemedMotionHelpers,
} from "./makeThemedMotionHelpersFromDefaults.types.ts";
import { isDefined } from "@avandar/utils";
import { match } from "ts-pattern";
import { Motion } from "../../motion";
import type { CSSProperties } from "react";

function _getRiseTransform({
  progress,
  travel,
  scale,
}: Readonly<{
  progress: number;
  travel: Readonly<{ x: number; y: number }>;
  scale: number;
}>): string {
  return [
    `translate(${Motion.mix({
      t: progress,
      from: travel.x,
      to: 0,
    }).toFixed(2)}px, ${Motion.mix({
      t: progress,
      from: travel.y,
      to: 0,
    }).toFixed(2)}px)`,
    scale !== 1
      ? `scale(${Motion.mix({
          t: progress,
          from: scale,
          to: 1,
        }).toFixed(4)})`
      : undefined,
  ]
    .filter(isDefined)
    .join(" ");
}
function _getPlaybackHelpers(
  defaults: MotionDefaults,
): Pick<
  ThemedMotionHelpers,
  "count" | "pop" | "press" | "caretOn" | "loopEnvelope"
> {
  return {
    count: (frame, at, to, duration = defaults.sheet) => {
      return Math.round(
        Motion.mix({
          t: Motion.ramp({
            frame,
            at,
            dur: duration,
            easing: defaults.entrance.easing,
          }),
          from: 0,
          to,
        }),
      );
    },
    pop: (frame, at, duration = defaults.emphasis.duration) => {
      return Motion.pop({
        frame,
        at,
        config: defaults.emphasis.spring,
        durationInFrames: duration,
      });
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
      return {
        opacity: Motion.ramp({
          frame,
          at,
          dur,
          easing,
        }),
      };
    })
    .with("rise", "scale", (entranceStyle) => {
      const progress = Motion.ramp({
        frame,
        at,
        dur,
        easing,
      });
      const scale =
        options.scale ??
        (entranceStyle === "scale" ? defaults.entranceScale : 1);
      const travel = entranceStyle === "scale" ? { x: 0, y: 0 } : { x, y };
      return {
        opacity: progress,
        transform: _getRiseTransform({ progress, travel, scale }),
      };
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
  const t = Motion.ramp({
    frame,
    at,
    dur,
    easing,
  });
  return {
    opacity: 1 - t,
    transform: `translate(${Motion.mix({
      t,
      from: 0,
      to: x,
    }).toFixed(2)}px, ${Motion.mix({
      t,
      from: 0,
      to: y,
    }).toFixed(2)}px)`,
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
    Motion.ramp({
      frame,
      at: 0,
      dur: fadeFrames,
      easing,
    }) *
    (1 -
      Motion.ramp({
        frame,
        at: duration - 1 - fadeFrames,
        dur: fadeFrames,
        easing,
      }))
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
 * `makeVideoMotionFromTokens`, which spreads them into `VideoMotion`.
 */
export function makeThemedMotionHelpersFromDefaults(
  defaults: MotionDefaults,
): ThemedMotionHelpers {
  const reveal = (frame: number, at: number) => {
    return Motion.ramp({
      frame,
      at,
      dur: defaults.reveal.duration,
      easing: defaults.reveal.easing,
    });
  };
  return {
    ramp: (
      frame,
      at,
      duration = defaults.panel,
      easing = defaults.reveal.easing,
    ) => {
      return Motion.ramp({
        frame,
        at,
        dur: duration,
        easing,
      });
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
    ..._getPlaybackHelpers(defaults),
  };
}
