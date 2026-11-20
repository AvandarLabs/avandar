import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { FractionMaterial } from "./FractionMaterial";
import type { Input } from "./FractionMaterialTranslation.schema";
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
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
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

/** A tick over each counted part of the fraction. */
function PartTicks({
  fraction,
  accent,
}: Readonly<{
  fraction: Input["fraction"];
  accent: string;
}>): ReactNode {
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
  return Array.from({ length: fraction.numerator }, (_, part) => {
    return (
      <SketchedShape
        key={part}
        shape={{
          kind: "path",
          d: `M${-96 + ((part + 0.5) * 192) / fraction.denominator} 30 V46`,
        }}
        profile={tokens.sketch.shape}
        stroke={accent}
        strokeWidth={scales.stroke(tokens.stroke.hairline)}
      />
    );
  });
}
