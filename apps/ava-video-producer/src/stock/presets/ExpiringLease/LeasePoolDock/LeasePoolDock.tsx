import { SketchedShape } from "../../../primitives/SketchedShape";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";

const DOCK = { kind: "circle", cx: 480, cy: 430, r: 34 } as const;
type Props = {
  frame: number;
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
  motion: ReturnType<typeof GraphicThemeHooks.useGraphicMotion>;
};
/** Draws the pool dock that receives the returning lease token. */
export function LeasePoolDock({
  frame,
  tokens,
  scales,
  motion,
}: Readonly<Props>): ReactNode {
  return (
    <>
      <g data-neutral-dock="pool">
        <SketchedShape
          shape={DOCK}
          profile={tokens.sketch.shape}
          fill={tokens.color.surface}
          stroke={tokens.color.line}
          strokeWidth={scales.stroke(tokens.stroke.emphasis)}
          opacity={motion.reveal(frame, 12)}
        />
      </g>
    </>
  );
}
