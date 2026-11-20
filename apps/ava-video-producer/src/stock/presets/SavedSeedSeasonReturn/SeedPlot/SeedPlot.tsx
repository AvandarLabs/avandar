import { SketchedShape } from "../../../primitives/SketchedShape";
import { StockRect } from "../../../primitives/StockRect/StockRect";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { Furrow } from "./Furrow";
import type { getSeedSceneFromFrame } from "../getSeedSceneFromFrame";
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
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
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
