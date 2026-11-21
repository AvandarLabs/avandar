import { BarComparisonMotion } from "../../../../../scenes/BarComparisonScene/BarComparisonMotion/BarComparisonMotion";
import { useVideoMotion } from "../../../../../videoTheme/useVideoMotion";
import { DemoTheme } from "../../DemoTheme";
import { HelperDemoFrame } from "../../HelperDemoFrame/HelperDemoFrame";
import { BarBeatRows } from "./BarBeatRows/BarBeatRows";
import css from "./BarBeatsDemo.module.css";
import type { HelperDemoProps } from "../../helperDemo.types";
import type { ReactNode } from "react";

/** The API call demonstrated by this preview. */
const BAR_BEATS_LABEL =
  "getBarComparisonBeats({ revealAtFrame: 8, panelIndex: 0, panelStaggerFrames: 3 })  getBarFractions(rows)";

/** A bar panel building on its computed beats: hero, labels, bars, values. */
export function BarBeatsDemo({
  frame,
  frames,
}: Readonly<HelperDemoProps>): ReactNode {
  const motion = useVideoMotion();
  const beats = BarComparisonMotion.getBarComparisonBeats({
    revealAtFrame: 8,
    panelIndex: 0,
    panelStaggerFrames: 3,
    motion,
  });
  return (
    <HelperDemoFrame
      frame={frame}
      frames={frames}
      label={BAR_BEATS_LABEL}
      readouts={Object.entries(beats).map(([name, value]) => {
        return {
          name,
          value: `${DemoTheme.formatReadout({ value, digits: 1 })}f`,
        };
      })}
    >
      <div className={css.barBeatsDemoBarPanel}>
        <p
          className={css.barBeatsDemoHeadline}
          style={motion.enter(frame, beats.heroAt)}
        >
          42
        </p>
        <BarBeatRows frame={frame} beats={beats} />
      </div>
      <span className={css.barBeatsDemoFootnote}>
        {"Fictional demonstration data"}
      </span>
    </HelperDemoFrame>
  );
}
