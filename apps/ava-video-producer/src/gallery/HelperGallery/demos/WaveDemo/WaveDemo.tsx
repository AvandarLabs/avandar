import { Motion } from "../../../../motion";
import { useVideoShapeScales } from "../../../../videoTheme/useVideoShapeScales";
import { DemoTheme } from "../DemoTheme";
import { HelperDemoFrame } from "../HelperDemoFrame/HelperDemoFrame";
import { LoopSeries } from "../LoopSeries/LoopSeries";
import { WaveHalo } from "../WaveHalo/WaveHalo";
import css from "./WaveDemo.module.css";
import type { HelperDemoProps } from "../helperDemo.types";
import type { ReactNode } from "react";

/** Renders WaveDemo for live helper catalog previews. */
export function WaveDemo({ frame, frames }: Readonly<Props>): ReactNode {
  const scales = useVideoShapeScales();
  const colors = DemoTheme.useDemoColors();
  const pulse = Motion.wave({
    frame,
    period: 45,
  });
  return (
    <HelperDemoFrame
      frame={frame}
      frames={frames}
      label="wave(frame, 45)"
      readouts={[
        { name: "wave", value: DemoTheme.formatReadout({ value: pulse }) },
      ]}
    >
      <div className={css.waveDemoCards}>
        <WaveHalo {...{ pulse, scales, colors }} />
        <div className={css.waveDemoCentered}>
          <LoopSeries
            frame={frame}
            frames={frames}
            sample={(value) => {
              return Motion.wave({
                frame: value,
                period: 45,
              });
            }}
          />
        </div>
      </div>
    </HelperDemoFrame>
  );
}

type Props = HelperDemoProps;
