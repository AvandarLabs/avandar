import { StockRect } from "../../primitives/StockRect/StockRect";
import {
  useGraphicMotion,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { FractionUnit } from "./FractionUnit";
import type { Input } from "./FractionMaterialTranslation.schema";
import type { ReactNode } from "react";

type Props = {
  representation: Input["representations"][number];
  fraction: Input["fraction"];
  frame: number;
  accent: string;
};
/** Equal units fold, gather or shade according to the authored material. */
export function FractionMaterial({
  representation,
  fraction,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const motion = useGraphicMotion();
  const progress = motion.ramp(
    frame,
    36,
    motion.scale(48),
    motion.travel.easing,
  );
  return (
    <g data-material={representation.material}>
      {representation.material === "folded-paper" ? (
        <StockRect
          x={-97}
          y={-25}
          width={194}
          height={50}
          fill={tokens.color.surface}
          stroke={tokens.color.text}
        />
      ) : undefined}
      {Array.from({ length: fraction.denominator }, (_, index) => {
        return (
          <FractionUnit
            key={index}
            representation={representation}
            fraction={fraction}
            index={index}
            progress={progress}
            accent={accent}
          />
        );
      })}
    </g>
  );
}
