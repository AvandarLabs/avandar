import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import type { Input } from "./SchoolLunchTrayComposition.schema";
import type { ReactNode } from "react";

type Props = {
  symbol: Input["plannedComponents"][number]["symbol"];
  color: string;
};
/** Component-type silhouettes carry no portion or nutrition quantity. */
export function FoodSymbol({ symbol, color }: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
  return (
    <g fill={color} stroke={color} strokeWidth={scales.stroke(1.3)}>
      {symbol === "grain" ? (
        <>
          <ellipse
            cx={-4}
            cy={-3}
            rx={scales.corner(3)}
            ry={scales.corner(5)}
          />
          <ellipse cx={4} cy={3} rx={scales.corner(3)} ry={scales.corner(5)} />
        </>
      ) : undefined}
      {symbol === "beans" ? (
        <>
          <path d="M-8 -4 Q0 -10 2 -3 Q4 4 -4 4 Q-10 3 -8 -4" />
          <path d="M1 4 Q7 -1 9 5 Q9 10 3 10 Z" />
        </>
      ) : undefined}
      {symbol === "fruit" ? (
        <>
          <circle r={8} />
          <SketchedShape
            shape={{ kind: "path", d: "M0 -8 Q1 -13 6 -12" }}
            profile={tokens.sketch.shape}
            fill="none"
            stroke={tokens.color.positive}
          />
        </>
      ) : undefined}
      {symbol === "vegetables" ? (
        <>
          <path d="M-8 -2 Q0 -13 8 -2 L0 10 Z" />
          <SketchedShape
            shape={{ kind: "path", d: "M0 -10 V9" }}
            profile={tokens.sketch.shape}
            stroke={tokens.color.surface}
          />
        </>
      ) : undefined}
      {symbol === "cup" ? (
        <>
          <path d="M-7 -9 H7 L5 9 H-5 Z" fill="none" />
          <path d="M7 -5 Q15 -5 9 4" fill="none" />
        </>
      ) : undefined}
    </g>
  );
}
