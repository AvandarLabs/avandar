import { SketchedShape } from "../../primitives/SketchedShape";
import { StockRect } from "../../primitives/StockRect/StockRect";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import type { getSeedSceneFromFrame } from "./getSeedSceneFromFrame";
import type { ReactNode } from "react";

type Props = {
  scene: ReturnType<typeof getSeedSceneFromFrame>;
  frame: number;
  accent: string;
};
/**
 * One plot turns fallow and accepts sowing without an inferred plant or yield.
 */
export function SeedPlot({ scene, frame, accent }: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const motion = useGraphicMotion();
  const scales = useGraphicShapeScales();
  return (
    <g>
      {" "}
      <StockRect
        data-same-plot=""
        x={728}
        y={320}
        width={200}
        height={90}
        rx={scales.corner(tokens.corner.card)}
        fill={tokens.color.surface}
        stroke={tokens.color.inactive}
      />
      <g data-stubble="">
        <SketchedShape
          shape={{
            kind: "path",
            d: "M750 360 v-16 m40 16 v-16 m40 16 v-16 m40 16 v-16 m40 16 v-16",
          }}
          profile={tokens.sketch.shape}
          stroke={tokens.color.highlight}
          opacity={
            1 - motion.ramp(frame, 49, motion.scale(51), motion.exit.easing)
          }
          fill="none"
        />
      </g>
      {scene.sown > 0 ? <Furrow frame={frame} accent={accent} /> : undefined}
    </g>
  );
}

/** The sowing furrow, drawn across the plot. */
function Furrow({
  frame,
  accent,
}: Readonly<{ frame: number; accent: string }>): ReactNode {
  const tokens = useGraphicTokens();
  const motion = useGraphicMotion();
  const scales = useGraphicShapeScales();
  return (
    <g data-furrow="">
      <SketchedShape
        shape={{
          kind: "line",
          x1: 738,
          y1: 399,
          x2:
            738 +
            180 * motion.ramp(frame, 108, motion.whip, motion.entrance.easing),
          y2: 399,
        }}
        profile={tokens.sketch.shape}
        stroke={accent}
        strokeWidth={scales.stroke(tokens.stroke.default)}
      />
    </g>
  );
}
