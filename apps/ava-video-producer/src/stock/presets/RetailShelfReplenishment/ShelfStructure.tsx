import { SketchedShape } from "../../primitives/SketchedShape";
import { StockRect } from "../../primitives/StockRect/StockRect";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "./RetailShelfReplenishment.schema";
import type { ReactNode } from "react";

type Props = { input: Input };
/** Shelf bays reserve an individual slot for every authored available unit. */
export function ShelfStructure({ input }: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return (
    <g>
      {" "}
      {input.goods.map((good, index) => {
        return (
          <g key={good.id}>
            <SketchedShape
              shape={{
                kind: "path",
                d: `M155 ${221 + index * 105} H480 M155 ${187 + index * 105} V${221 + index * 105}`,
              }}
              profile={tokens.sketch.shape}
              stroke={tokens.color.line}
              strokeWidth={scales.stroke(tokens.stroke.emphasis)}
            />
            {Array.from(
              { length: good.openingUnits + good.incomingUnits },
              (_, slot) => {
                return (
                  <StockRect
                    key={slot}
                    x={166 + slot * 56}
                    y={183 + index * 105}
                    width={28}
                    height={34}
                    rx={scales.corner(tokens.corner.chip)}
                    fill="none"
                    stroke={tokens.color.line}
                    strokeDasharray={tokens.dash.guide.join(" ")}
                  />
                );
              },
            )}
          </g>
        );
      })}
    </g>
  );
}
