import { PersonGlyph } from "../../../primitives/PersonGlyph/PersonGlyph";
import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";

type Props = {
  destination: Readonly<{ x: number; y: number }>;
  frame: number;
  accent: string;
};

/** The receiving gate, its arm lifting for the convoy, with its keeper. */
export function ArrivalGate({
  destination,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return (
    <g
      data-gate="arrival"
      transform={`translate(${80 + destination.x * 800} ${180 + destination.y * 280})`}
    >
      <SketchedShape
        shape={{
          kind: "path",
          d: `M-25 -28 V-52 M25 -28 V-52 M-25 -40 L${25 - 42 * motion.reveal(frame, 114)} ${-40 - 28 * motion.reveal(frame, 114)}`,
        }}
        profile={tokens.sketch.shape}
        stroke={accent}
        strokeWidth={scales.stroke(tokens.stroke.emphasis)}
      />
      <PersonGlyph x={42} y={-40} size={30} color={tokens.color.accentAlt} />
    </g>
  );
}
