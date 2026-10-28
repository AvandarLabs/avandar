import { STOCK } from "../../stockPalette";
import type { ReactNode } from "react";

type Props = {
  id: string;
  index: number;
  centerX: number;
  cellWidth: number;
  progress: number;
  selected: boolean;
  accent: string;
};
/** A folded strip resolves into one equal selected or unselected paper part. */
export function FractionPaperPart({
  id,
  index,
  centerX,
  cellWidth,
  progress,
  selected,
  accent,
}: Readonly<Props>): ReactNode {
  const fold = Math.sin(progress * Math.PI) * 18 * (index % 2 === 0 ? -1 : 1);
  return (
    <path
      data-piece-owner={id}
      data-selected={selected}
      d={`M${centerX - cellWidth / 2} -24 L${centerX + cellWidth / 2} ${-24 + fold} V${24 + fold} L${centerX - cellWidth / 2} 24 Z`}
      fill={selected ? accent : STOCK.surface}
      fillOpacity={selected ? progress : 1}
      stroke={STOCK.text}
      strokeOpacity={progress}
      strokeWidth={1}
    />
  );
}
