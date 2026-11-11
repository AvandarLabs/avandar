import { Trans } from "@lingui/react/macro";
import clsx from "clsx";
import { bezier, EASE } from "../../../motion";
import {
  getMotionDuration,
  getMotionProgress,
  MOTION_PRESETS,
  resolveMotionSettings,
} from "../../../motion-components/motionSettings";
import css from "./demos.module.css";
import { formatReadout } from "./demoTheme";
import { HelperDemoFrame } from "./HelperDemoFrame/HelperDemoFrame";
import { CurvePlot } from "./parts/CurvePlot";
import type { HelperDemoProps } from "./helperDemo.types";

/** Linear time through a curve preview: a 10-frame rest, then 45 frames. */
function _getCurveTime(frame: number): number {
  return Math.min(1, Math.max(0, (frame - 10) / 45));
}

/** Width of the rails the eased and linear blocks travel along. */
const RAIL_TRAVEL = 400;

type StageProps = {
  easing: (t: number) => number;
  t: number;
  handles?: readonly [number, number, number, number];
};

/** A plotted curve beside a block moving on it and a linear reference. */
function EasingStage({ easing, t, handles }: StageProps) {
  return (
    <div className={css.split}>
      <div className={css.plotCell}>
        <CurvePlot easing={easing} t={t} size={330} handles={handles} />
      </div>
      <div className={css.rails}>
        <div className={css.rail}>
          <span className={css.railLabel}>
            <Trans>eased</Trans>
          </span>
          <span
            className={css.railBlock}
            style={{ left: easing(t) * RAIL_TRAVEL }}
          />
        </div>
        <div className={css.rail}>
          <span className={css.railLabel}>
            <Trans>linear time</Trans>
          </span>
          <span
            className={clsx(css.railBlock, css.railGhost)}
            style={{ left: t * RAIL_TRAVEL }}
          />
        </div>
      </div>
    </div>
  );
}

/** A preview of one `EASE` token, labelled with its definition. */
export function createCurveDemo(name: keyof typeof EASE) {
  return function CurveDemo({ frame, frames, helper }: HelperDemoProps) {
    const t = _getCurveTime(frame);
    const easing = EASE[name];
    return (
      <HelperDemoFrame
        frame={frame}
        frames={frames}
        label={`EASE.${name} = ${helper.defaults[0]?.value ?? ""}`}
        readouts={[
          { name: "t", value: formatReadout(t) },
          { name: `EASE.${name}(t)`, value: formatReadout(easing(t)) },
        ]}
      >
        <EasingStage easing={easing} t={t} />
      </HelperDemoFrame>
    );
  };
}

/** The example custom curve, with its control points drawn as handles. */
const CUSTOM_POINTS = [0.2, 0.8, 0.2, 1] as const;
const CUSTOM_EASING = bezier(...CUSTOM_POINTS);

/** `bezier()` building a custom curve from four control points. */
export function BezierDemo({ frame, frames }: HelperDemoProps) {
  const t = _getCurveTime(frame);
  return (
    <HelperDemoFrame
      frame={frame}
      frames={frames}
      label={`bezier(${CUSTOM_POINTS.join(", ")})`}
      readouts={[
        { name: "t", value: formatReadout(t) },
        { name: "value", value: formatReadout(CUSTOM_EASING(t)) },
      ]}
    >
      <EasingStage easing={CUSTOM_EASING} t={t} handles={CUSTOM_POINTS} />
    </HelperDemoFrame>
  );
}

const PRESETS = Object.keys(MOTION_PRESETS) as Array<
  keyof typeof MOTION_PRESETS
>;
/** The authored travel every preset row retimes. */
const AUTHORED_FRAMES = 24;

/** The five motion presets retiming the same 24-frame move. */
export function MotionPresetsDemo({ frame, frames }: HelperDemoProps) {
  return (
    <HelperDemoFrame
      frame={frame}
      frames={frames}
      label={`getMotionProgress(frame, 10, ${AUTHORED_FRAMES}, { preset })`}
      readouts={[{ name: "authored", value: `${AUTHORED_FRAMES}f` }]}
    >
      <div className={css.timeline}>
        {PRESETS.map((preset) => {
          const progress = getMotionProgress(frame, 10, AUTHORED_FRAMES, {
            preset,
          });
          const settings = resolveMotionSettings({ preset });
          return (
            <div key={preset} className={css.timelineRow}>
              <span className={css.timelineName}>
                {preset} · {getMotionDuration(AUTHORED_FRAMES, { preset })}f ·{" "}
                {settings.shutterAngle}°
              </span>
              <div className={css.rail}>
                <span
                  className={css.railBlock}
                  style={{ left: progress * 560 }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </HelperDemoFrame>
  );
}
