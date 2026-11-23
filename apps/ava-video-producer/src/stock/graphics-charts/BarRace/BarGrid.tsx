import { Text } from "../../graphics-common/Text";
import { SketchedShape } from "../../primitives/SketchedShape";
import type { BarGridData } from "./BarRace.types";
import type { ReactNode } from "react";

type Props = BarGridData;

/** Renders the bar grid layer for BarRace. */
export function BarGrid(options: Readonly<Props>): ReactNode {
  return (
    <>
      {[0, 25, 50, 75, 100].map((value) => {
        return (
          <g key={value}>
            <SketchedShape
              shape={{
                kind: "line",
                x1: 205 + value * 6,
                y1: 157,
                x2: 205 + value * 6,
                y2: 474,
              }}
              profile={options.sketch.shape}
              stroke={options.color.line}
              strokeOpacity={options.alpha.guide}
              strokeWidth={options.hairline}
            />
            <Text role="footnote" x={205 + value * 6} y={507} anchor="middle">
              {value}
            </Text>
          </g>
        );
      })}
    </>
  );
}
