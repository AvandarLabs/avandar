import { SketchedShape } from "../../primitives/SketchedShape";
import { StockRect } from "../../primitives/StockRect";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";
/** The original consultation table and supporter chair stay in place. */
export function ConversationFurniture(): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return (
    <g>
      {" "}
      <StockRect
        x={48}
        y={150}
        width={550}
        height={380}
        rx={scales.corner(20)}
        fill="none"
        stroke={tokens.color.line}
      />
      <StockRect
        data-table="meeting"
        x={170}
        y={330}
        width={340}
        height={54}
        rx={scales.corner(22)}
        fill={tokens.color.surface}
        stroke={tokens.color.line}
      />
      <g data-original-supporter-chair="empty-after-exit">
        <SketchedShape
          shape={{
            kind: "path",
            d: "M310 397 v54 h48 v-18 M310 451 v18 M358 451 v18",
          }}
          profile={tokens.sketch.shape}
          fill="none"
          stroke={tokens.color.inactive}
          strokeWidth={scales.stroke(tokens.stroke.heavy)}
        />
      </g>
    </g>
  );
}
