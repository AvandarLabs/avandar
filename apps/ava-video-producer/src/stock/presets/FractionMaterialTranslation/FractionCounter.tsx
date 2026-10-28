import { mix } from "../../../motion";
import { STOCK } from "../../stockPalette";
import type { ReactNode } from "react";

type Props = {
  id: string;
  index: number;
  centerX: number;
  progress: number;
  selected: boolean;
  accent: string;
};
/** Equal physical counters gather into the common fraction's row. */
export function FractionCounter({
  id,
  index,
  centerX,
  progress,
  selected,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <circle
      data-piece-owner={id}
      data-selected={selected}
      cx={mix(progress, -82 + (index % 4) * 54, centerX)}
      cy={mix(progress, index < 4 ? -36 : 36, 0)}
      r={8}
      fill={selected ? accent : STOCK.surface}
      stroke={selected ? accent : STOCK.muted}
      strokeWidth={2}
    />
  );
}
