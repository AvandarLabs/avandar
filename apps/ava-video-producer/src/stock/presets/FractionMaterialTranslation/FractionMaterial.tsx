import { EASE, ramp } from "../../../motion";
import { STOCK } from "../../stockPalette";
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
  const progress = ramp(frame, 36, 48, EASE.inOut);
  return (
    <g data-material={representation.material}>
      {representation.material === "folded-paper" ? (
        <rect
          x={-97}
          y={-25}
          width={194}
          height={50}
          fill={STOCK.surface}
          stroke={STOCK.text}
        />
      ) : undefined}
      {Array.from({ length: fraction.denominator }, (_, index) => (
        <FractionUnit
          key={index}
          representation={representation}
          fraction={fraction}
          index={index}
          progress={progress}
          accent={accent}
        />
      ))}
    </g>
  );
}
