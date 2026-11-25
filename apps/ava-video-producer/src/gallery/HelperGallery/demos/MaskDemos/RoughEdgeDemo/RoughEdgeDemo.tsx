import { BarComparisonMotion } from "../../../../../scenes/BarComparisonScene/BarComparisonMotion/BarComparisonMotion";
import { useVideoMotion } from "../../../../../videoTheme/useVideoMotion";
import { HelperDemoFrame } from "../../HelperDemoFrame/HelperDemoFrame";
import css from "./RoughEdgeDemo.module.css";
import type { HelperDemoProps } from "../../helperDemo.types";
import type { ReactNode } from "react";

const BAR_VALUES = [0.92, 0.7, 0.55, 0.38];

const EDGE_DEPTH = 10;

/** When the bars start growing. A cue, not a length. */
const BARS_AT = 10;

/** Bars growing with a seeded, brush-like right edge. */
export function RoughEdgeDemo({
  frame,
  frames,
}: Readonly<HelperDemoProps>): ReactNode {
  const motion = useVideoMotion();
  return (
    <HelperDemoFrame
      frame={frame}
      frames={frames}
      label={`BarComparisonMotion.getRoughEdgeClipPath({ seed: rowIndex, depth: ${EDGE_DEPTH} })`}
      readouts={[
        { name: "depth", value: `${EDGE_DEPTH}px` },
        { name: "seed", value: "row index" },
      ]}
    >
      <div className={css.roughEdgeDemoTimeline}>
        {BAR_VALUES.map((value, index) => {
          return (
            <div key={value} className={css.roughEdgeDemoRow}>
              <div
                className={css.roughEdgeDemoBar}
                style={{
                  width:
                    motion.ramp(
                      frame,
                      BARS_AT + index * motion.stagger.list,
                      motion.sheet,
                      motion.rise.easing,
                    ) *
                    value *
                    760,
                  clipPath: BarComparisonMotion.getRoughEdgeClipPath({
                    seed: index,
                    depth: EDGE_DEPTH,
                  }),
                }}
              />
            </div>
          );
        })}
      </div>
    </HelperDemoFrame>
  );
}
