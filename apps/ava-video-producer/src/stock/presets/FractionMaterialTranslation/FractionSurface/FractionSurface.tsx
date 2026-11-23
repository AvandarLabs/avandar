import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { FractionMaterial } from "../FractionMaterial";
import { PartTicks } from "./PartTicks";
import type { Input } from "../FractionMaterialTranslation.schema";
import type { ReactNode } from "react";

type Props = {
  input: Input;
  representation: Input["representations"][number];
  x: number;
  y: number;
  frame: number;
  accent: string;
};
/** Draws the FractionSurface group with fixed authored geometry. */
export function FractionSurface({
  input,
  representation,
  x,
  y,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return (
    <>
      <g
        data-work-surface={representation.id}
        transform={`translate(${x} ${y})`}
      >
        <SketchedShape
          shape={{ kind: "path", d: "M-108 58 H108 M-98 58 V79 M98 58 V79" }}
          profile={tokens.sketch.shape}
          fill="none"
          stroke={tokens.color.line}
          strokeWidth={scales.stroke(tokens.stroke.emphasis)}
        />
        <FractionMaterial
          representation={representation}
          fraction={input.fraction}
          frame={frame}
          accent={accent}
        />
        {frame >= 88 && frame < 126 ? (
          <PartTicks fraction={input.fraction} accent={accent} />
        ) : undefined}
      </g>
    </>
  );
}
