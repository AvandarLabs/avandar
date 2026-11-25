import { Motion } from "../../../../../motion";
import { useVideoMotion } from "../../../../../videoTheme/useVideoMotion";
import { DemoTheme } from "../../DemoTheme";
import { HelperDemoFrame } from "../../HelperDemoFrame/HelperDemoFrame";
import { CurvePlot } from "../../parts/CurvePlot/CurvePlot";
import { DemoCard } from "../../parts/DemoCard/DemoCard";
import css from "./PopDemo.module.css";
import type { HelperDemoProps } from "../../helperDemo.types";
import type { DemoReadout } from "../../HelperDemoFrame/HelperDemoFrame";
import type { CSSProperties, ReactNode } from "react";

const POP_AT = 15;

/** Formats the live readouts displayed by PopDemo. */
function _getPopReadouts(landing: number): DemoReadout[] {
  return [
    { name: "pop", value: DemoTheme.formatReadout({ value: landing }) },
    {
      name: "y",
      value: `${DemoTheme.formatReadout({
        value: Motion.mix({
          t: landing,
          from: -80,
          to: 0,
        }),
        digits: 1,
      })}px`,
    },
  ];
}

/** Converts the landing sample to the card opacity and translation. */
function _makeCardStyleFromLanding({
  frame,
  landing,
  motion,
}: {
  frame: number;
  landing: number;
  motion: ReturnType<typeof useVideoMotion>;
}): CSSProperties {
  return {
    opacity: motion.ramp(frame, POP_AT, motion.chip, motion.reveal.easing),
    transform: `translateY(${Motion.mix({
      t: landing,
      from: -80,
      to: 0,
    }).toFixed(2)}px)`,
  };
}

/** A card landing on a spring, beside the spring's own curve. */
export function PopDemo({
  frame,
  frames,
}: Readonly<HelperDemoProps>): ReactNode {
  const motion = useVideoMotion();
  const landing = motion.pop(frame, POP_AT);
  const { duration, spring } = motion.emphasis;
  const time = Math.min(1, Math.max(0, (frame - POP_AT) / duration));
  return (
    <HelperDemoFrame
      frame={frame}
      frames={frames}
      label={`pop(frame, ${POP_AT})  damping ${spring.damping} · stiffness ${spring.stiffness} · mass ${spring.mass}`}
      readouts={_getPopReadouts(landing)}
    >
      <div className={css.popDemoSplit}>
        <div className={css.popDemoPlotCell}>
          <CurvePlot
            easing={(value) => {
              return motion.pop(value * duration, 0);
            }}
            t={time}
            size={300}
          />
        </div>
        <div className={css.popDemoCentered}>
          <DemoCard
            title="Export ready"
            style={_makeCardStyleFromLanding({ frame, landing, motion })}
          />
        </div>
      </div>
    </HelperDemoFrame>
  );
}
