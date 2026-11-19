import { mix } from "../../../motion";
import { StockRect } from "../../primitives/StockRect/StockRect";
import {
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import type { ReactNode } from "react";

type Props = { progress: number };
/** Classroom Desks for the authored scene. */
export function ClassroomDesks({ progress }: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
  return (
    <g data-desks={progress}>
      {[0, 1, 2, 3].map((index) => {
        return (
          <StockRect
            key={index}
            data-desk={index}
            x={mix(progress, 230 + index * 95, index < 2 ? 65 : 625)}
            y={mix(progress, 335, index % 2 ? 425 : 335)}
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
