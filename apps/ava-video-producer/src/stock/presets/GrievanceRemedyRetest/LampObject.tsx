import { SketchedShape } from "../../primitives/SketchedShape";
import { StockRect } from "../../primitives/StockRect";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";
/** Inputs for LampObject. */
type Props = { functioning: number; accent: string };
/** A desk lamp illuminates only after a functioning participant retest. */
export function LampObject({
  functioning,
  accent,
}: Readonly<Props>): ReactNode {
  const { atomic } = GraphicThemeHooks.useGraphicTheme();
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return (
    <g>
      <SketchedShape
        shape={{
          kind: "path",
          d: "M425 404 H565 M495 402 V284 L540 251 L570 281 L520 297 Z",
        }}
        profile={tokens.sketch.shape}
        fill={tokens.color.surface}
        stroke={tokens.color.inactive}
        strokeWidth={scales.stroke(5)}
      />
      <path
        data-light="authored"
        d="M522 300 L440 388 H610 L565 295 Z"
        fill={tokens.color.highlight}
        opacity={functioning * atomic.opacity["35"]}
      />
      <StockRect
        x={550}
        y={318}
        width={24}
        height={24}
        rx={scales.corner(tokens.corner.chip)}
        fill={tokens.color.surface}
        stroke={accent}
      />
    </g>
  );
}
