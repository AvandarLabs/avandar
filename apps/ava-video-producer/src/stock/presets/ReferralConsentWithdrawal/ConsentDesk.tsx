import { SketchedShape } from "../../primitives/SketchedShape";
import { StockRect } from "../../primitives/StockRect/StockRect";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";
/** The idle phone remains separate from held preparations. */
export function ConsentDesk(): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return (
    <g>
      {" "}
      <SketchedShape
        shape={{ kind: "path", d: "M390 175 H910 M410 175 V480 M900 175 V480" }}
        profile={tokens.sketch.shape}
        fill="none"
        stroke={tokens.color.line}
        strokeWidth={scales.stroke(tokens.stroke.emphasis)}
      />
      <g data-phone="idle">
        <StockRect
          x={850}
          y={135}
          width={48}
          height={28}
          rx={scales.corner(tokens.corner.cell)}
          fill={tokens.color.surface}
          stroke={tokens.color.inactive}
        />
        <SketchedShape
          shape={{ kind: "path", d: "M858 145 Q874 132 890 145" }}
          profile={tokens.sketch.shape}
          fill="none"
          stroke={tokens.color.inactive}
          strokeWidth={scales.stroke(5)}
        />
      </g>
    </g>
  );
}
