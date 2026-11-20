import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { SketchedShape } from "../../primitives/SketchedShape";
import { StockRect } from "../../primitives/StockRect/StockRect";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "./QueryColumnCacheGrowth.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };
/**
 * Two authored request cards retain their labels through the coverage checks.
 */
export function CacheRequestCards({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const style = GraphicThemeHooks.useGraphicProps("QueryColumnCacheGrowth", {});
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const { color, sketch } = GraphicThemeHooks.useGraphicTokens();
  return (
    <g>
      {input.requests.map((request, index) => {
        return (
          <g key={index}>
            <StockRect
              x={60 + index * 440}
              y={54}
              width={400}
              height={124}
              rx={scales.corner(style.cardRadius)}
              fill={color.elevated}
              stroke={index === 0 && frame >= 40 ? accent : color.line}
              strokeWidth={scales.stroke(style.cardStrokeWidth)}
            />
            <LabelSlots
              labels={[[request.label, 80 + index * 440, 82, 330, 18, 3]]}
            />
            {index === 0 && frame >= 40 ? (
              <SketchedShape
                shape={{ kind: "path", d: "M420 132 l10 10 l18 -26" }}
                profile={sketch.shape}
                data-covered="true"
                stroke={accent}
                strokeWidth={scales.stroke(style.checkWidth)}
                fill="none"
              />
            ) : undefined}
          </g>
        );
      })}
    </g>
  );
}
