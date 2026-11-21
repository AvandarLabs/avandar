import { Motion } from "../../../motion";
import { StockRect } from "../../primitives/StockRect";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";

type Props = {
  progress: number;
};
/** Classroom Desks for the authored scene. */
export function ClassroomDesks({ progress }: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return (
    <g data-desks={progress}>
      {[0, 1, 2, 3].map((index) => {
        return (
          <StockRect
            key={index}
            data-desk={index}
            x={Motion.mix({
              t: progress,
              from: 230 + index * 95,
              to: index < 2 ? 65 : 625,
            })}
            y={Motion.mix({
              t: progress,
              from: 335,
              to: index % 2 ? 425 : 335,
            })}
            width={88}
            height={42}
            rx={scales.corner(5)}
            fill={tokens.color.surface}
            stroke={tokens.color.line}
            strokeWidth={scales.stroke(tokens.stroke.default)}
          />
        );
      })}
    </g>
  );
}
