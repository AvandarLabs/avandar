import { mix } from "../../../motion";
import { SketchedShape } from "../../primitives/SketchedShape";
import { StockRect } from "../../primitives/StockRect/StockRect";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";
/** Inputs for LockerObject. */
type Props = { functioning: number; accent: string };
/** The locker door stays visibly ajar until a functioning retest. */
export function LockerObject({
  functioning,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return (
    <g>
      <StockRect
        x={400}
        y={230}
        width={180}
        height={180}
        rx={scales.corner(6)}
        fill={tokens.color.surface}
        stroke={tokens.color.inactive}
        strokeWidth={scales.stroke(tokens.stroke.emphasis)}
      />
      <SketchedShape
        shape={{
          kind: "path",
          d: `M406 237 L${mix(functioning, 490, 574)} ${mix(functioning, 260, 237)} V${mix(functioning, 430, 403)} L406 403 Z`,
        }}
        profile={tokens.sketch.shape}
        data-locker-door="operated"
        fill={tokens.color.surface}
        stroke={accent}
        strokeWidth={scales.stroke(tokens.stroke.emphasis)}
      />
    </g>
  );
}
