import { SketchedShape } from "../../primitives/SketchedShape";
import { StockRect } from "../../primitives/StockRect";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";

type Props = { accent: string };

/** The delivery table and the recipient's basket mat. */
export function HandoverFurniture({ accent }: Readonly<Props>): ReactNode {
  const { atomic } = GraphicThemeHooks.useGraphicTheme();
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return (
    <>
      <StockRect
        x={353}
        y={165}
        width={140}
        height={300}
        rx={scales.corner(tokens.corner.cell)}
        fill={tokens.color.elevated}
        stroke={tokens.color.line}
        strokeDasharray={atomic.dash.spaced.join(" ")}
      />
      <SketchedShape
        shape={{
          kind: "path",
          d: "M520 165 V475 H678 V165 M520 455 H678 M540 450 V475 M560 450 V475 M580 450 V475 M600 450 V475 M620 450 V475 M640 450 V475 M660 450 V475",
        }}
        profile={tokens.sketch.shape}
        fill="none"
        stroke={accent}
        strokeWidth={scales.stroke(tokens.stroke.default)}
      />
    </>
  );
}
