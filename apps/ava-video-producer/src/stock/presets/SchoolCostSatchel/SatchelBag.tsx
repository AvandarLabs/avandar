import { mix } from "../../../motion";
import { SketchedShape } from "../../primitives/SketchedShape";
import { StockRect } from "../../primitives/StockRect/StockRect";
import {
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import type { ReactNode } from "react";

type Props = { opening: number; accent: string };
/** Draws the scene's SatchelBag group with fixed authored geometry. */
export function SatchelBag({ opening, accent }: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
  return (
    <>
      <g data-satchel-hand="true">
        <SketchedShape
          shape={{
            kind: "path",
            d: `M245 240 L263 250 L275 ${mix(opening, 254, 231)}`,
          }}
          profile={tokens.sketch.shape}
          fill="none"
          stroke={accent}
          strokeWidth={scales.stroke(tokens.stroke.emphasis)}
          strokeLinecap="round"
        />
      </g>
      <StockRect
        x={263}
        y={253}
        width={46}
        height={43}
        rx={scales.corner(7)}
        fill={tokens.color.surface}
        stroke={accent}
        strokeWidth={scales.stroke(tokens.stroke.default)}
      />
      <g data-satchel-flap="true">
        <SketchedShape
          shape={{
            kind: "path",
            d: `M263 253 L263 ${mix(opening, 270, 226)} Q286 ${mix(opening, 277, 214)} 309 ${mix(opening, 270, 226)} L309 253`,
          }}
          profile={tokens.sketch.shape}
          fill={tokens.color.surface}
          stroke={accent}
          strokeWidth={scales.stroke(tokens.stroke.default)}
        />
      </g>
    </>
  );
}
