import { Motion } from "../../../../motion";
import { SketchedShape } from "../../../../stock/primitives/SketchedShape";
import { useVideoShapeScales } from "../../../../videoTheme/useVideoShapeScales";
import { useVideoTokens } from "../../../../videoTheme/videoThemeHelpers";
import { DemoTheme } from "../DemoTheme";
import type { ReactNode } from "react";

const ORBITS = [0, 20, 40];

const PERIOD = 60;

/** Radius of the orbit the phase dots travel. */
const ORBIT_RADIUS = 110;

/** Renders Orbits for live helper catalog previews. */
export function Orbits({ frame }: Readonly<Props>): ReactNode {
  const { stroke, sketch } = useVideoTokens();
  const scales = useVideoShapeScales();
  const colors = DemoTheme.useDemoColors();
  return (
    <svg
      width={300}
      height={300}
      viewBox="-150 -150 300 300"
      aria-hidden="true"
    >
      <SketchedShape
        shape={{ kind: "circle", cx: 0, cy: 0, r: ORBIT_RADIUS }}
        profile={sketch.shape}
        fill="none"
        stroke={colors.line}
        strokeWidth={scales.stroke(stroke.default)}
      />
      {ORBITS.map((offset) => {
        const angle =
          Motion.loopPhase({
            frame,
            period: PERIOD,
            offset,
          }) *
          Math.PI *
          2;
        return (
          <circle
            key={offset}
            cx={Math.cos(angle) * ORBIT_RADIUS}
            cy={Math.sin(angle) * ORBIT_RADIUS}
            r={14}
            fill={colors.brand}
          />
        );
      })}
    </svg>
  );
}

type Props = { frame: number };
