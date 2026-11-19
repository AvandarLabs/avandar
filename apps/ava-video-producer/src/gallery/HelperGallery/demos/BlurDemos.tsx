import { DUR, EASE, mix, ramp } from "../../../motion";
import { getHorizontalBlurFilter } from "../../../motion-components/getHorizontalBlurFilter/getHorizontalBlurFilter";
import { HorizontalBlurFilter } from "../../../motion-components/HorizontalBlur";
import { getVelocityBlur } from "../../../motion-components/motionSettings";
import css from "./demos.module.css";
import { formatReadout } from "./demoTheme";
import { HelperDemoFrame } from "./HelperDemoFrame/HelperDemoFrame";
import { DemoCard } from "./parts/DemoCard";
import type { HelperDemoProps } from "./helperDemo.types";
import type { ReactNode } from "react";

/** How far the sliding cards travel, in pixels. */
const TRAVEL = 600;

/** A card sliding right, holding, then sliding back, by frame. */
function _getSlideX(frame: number): number {
  const out = ramp(frame, 10, DUR.sheet, EASE.inOut);
  const back = ramp(frame, 36, DUR.sheet, EASE.inOut);
  return mix(out - back, 0, TRAVEL);
}

/** Horizontal blur radius from the distance travelled since the last frame. */
function _getBlurAmount(frame: number): number {
  return Math.min(
    40,
    Math.abs(_getSlideX(frame) - _getSlideX(frame - 1)) * 0.6,
  );
}

/** The same slide with the X-only blur filter and with no blur. */
export function HorizontalBlurDemo({
  frame,
  frames,
}: HelperDemoProps): ReactNode {
  const amount = _getBlurAmount(frame);
  const x = _getSlideX(frame);
  return (
    <HelperDemoFrame
      frame={frame}
      frames={frames}
      label='<HorizontalBlurFilter id="slide" amount={amount} />'
      readouts={[
        { name: "amount", value: `${formatReadout(amount, 1)}px` },
        {
          name: "filter",
          value: getHorizontalBlurFilter("slide", amount) ?? "none",
        },
      ]}
    >
      <HorizontalBlurFilter id="slide" amount={amount} />
      <div className={css.rails}>
        <div className={css.cardColumn}>
          <span className={css.caption}>{"X-only blur"}</span>
          <DemoCard
            title="Moving window"
            style={{
              transform: `translateX(${(x - TRAVEL / 2).toFixed(2)}px)`,
              filter: getHorizontalBlurFilter("slide", amount),
            }}
          />
        </div>
        <div className={css.cardColumn}>
          <span className={css.caption}>{"No blur"}</span>
          <DemoCard
            title="Moving window"
            style={{
              transform: `translateX(${(x - TRAVEL / 2).toFixed(2)}px)`,
            }}
          />
        </div>
      </div>
    </HelperDemoFrame>
  );
}

const PRESETS = ["gentle", "brisk", "whip"] as const;

/** Velocity blur for the same move under three motion presets. */
export function VelocityBlurDemo({
  frame,
  frames,
}: HelperDemoProps): ReactNode {
  const x = mix(ramp(frame, 15, 24, EASE.inOutCubic), 0, 700);
  const velocity = Math.abs(
    x - mix(ramp(frame - 1, 15, 24, EASE.inOutCubic), 0, 700),
  );
  return (
    <HelperDemoFrame
      frame={frame}
      frames={frames}
      label="getVelocityBlur(distancePerFrame, { preset })"
      readouts={[
        { name: "velocity", value: `${formatReadout(velocity, 1)}px/f` },
        ...PRESETS.map((preset) => {
          return {
            name: preset,
            value: `${formatReadout(getVelocityBlur(velocity, { preset }))}px`,
          };
        }),
      ]}
    >
      <div className={css.timeline}>
        {PRESETS.map((preset) => {
          return (
            <div key={preset} className={css.timelineRow}>
              <span className={css.timelineName}>{preset}</span>
              <div className={css.rail}>
                <span
                  className={css.railBlock}
                  style={{
                    left: x * 0.85,
                    filter: `blur(${getVelocityBlur(velocity, { preset }).toFixed(2)}px)`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </HelperDemoFrame>
  );
}
