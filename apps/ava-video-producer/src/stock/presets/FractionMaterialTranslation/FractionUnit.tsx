import { FractionBoardCell } from "./FractionBoardCell";
import { FractionCounter } from "./FractionCounter";
import { FractionPaperPart } from "./FractionPaperPart";
import type { Input } from "./FractionMaterialTranslation.schema";
import type { ReactNode } from "react";

type Props = {
  representation: Input["representations"][number];
  fraction: Input["fraction"];
  index: number;
  progress: number;
  accent: string;
};
/** Chooses the actual material operation for one common equal-part index. */
export function FractionUnit({
  representation,
  fraction,
  index,
  progress,
  accent,
}: Readonly<Props>): ReactNode {
  const cellWidth = 192 / fraction.denominator;
  const props = {
    id: representation.id,
    index,
    centerX: -96 + (index + 0.5) * cellWidth,
    cellWidth,
    progress,
    selected: index < fraction.numerator && progress > 0,
    accent,
  };
  return representation.material === "counters" ? (
    <FractionCounter {...props} />
  ) : representation.material === "shaded-board" ? (
    <FractionBoardCell {...props} />
  ) : (
    <FractionPaperPart {...props} />
  );
}
