import { Motion } from "../../../../motion";
import { SketchedShape } from "../../../primitives/SketchedShape";
import { TermTurn } from "./TermTurn";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";

type Props = {
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
  turning: number;
  x: number;
  y: number;
};

/** Renders the revenue outlet turn in authored paint order. */
export function RevenueOutletTurn(options: Readonly<Props>): ReactNode {
  return (
    <>
      <TermTurn x={options.x} y={options.y} turning={options.turning} />
      <SketchedShape
        shape={{
          kind: "path",
          d: `M${options.x - 15} ${options.y + 32} L${options.x + 15} ${
            options.y +
            32 -
            Motion.mix({
              t: options.turning,
              from: 28,
              to: 0,
            })
          }`,
        }}
        profile={options.tokens.sketch.shape}
        data-outlet="distribution"
        data-closed={options.turning === 1}
        stroke={options.tokens.color.highlight}
        strokeWidth={options.scales.stroke(5)}
      />
    </>
  );
}
