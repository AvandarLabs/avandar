import { Motion } from "../../../../motion";
import { DemoTheme } from "../DemoTheme";
import { HelperDemoFrame } from "../HelperDemoFrame/HelperDemoFrame";
import { LoopSeries } from "../LoopSeries/LoopSeries";
import { Orbits } from "../Orbits/Orbits";
import css from "./LoopPhaseDemo.module.css";
import type { HelperDemoProps } from "../helperDemo.types";
import type { ReactNode } from "react";

const ORBITS = [0, 20, 40];

const PERIOD = 60;

/** Renders LoopPhaseDemo for live helper catalog previews. */
export function LoopPhaseDemo({ frame, frames }: Readonly<Props>): ReactNode {
  return (
    <HelperDemoFrame
      frame={frame}
      frames={frames}
      label={`loopPhase(frame, ${PERIOD}, offset)  offsets ${ORBITS.join(", ")}`}
      readouts={ORBITS.map((offset) => {
        return {
          name: `offset ${offset}`,
          value: DemoTheme.formatReadout({
            value: Motion.loopPhase({
              frame,
              period: PERIOD,
              offset,
            }),
          }),
        };
      })}
    >
      <div className={css.loopPhaseDemoCards}>
        <Orbits frame={frame} />
        <div className={css.loopPhaseDemoCentered}>
          <LoopSeries
            frame={frame}
            frames={frames}
            sample={(value) => {
              return Motion.loopPhase({
                frame: value,
                period: PERIOD,
              });
            }}
          />
        </div>
      </div>
    </HelperDemoFrame>
  );
}

type Props = HelperDemoProps;
