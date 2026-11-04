import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import type { ReactNode } from "react";

type Props = {
  id: string;
  value: string;
  x: number;
  y: number;
  opacity: number;
  isMissing: boolean;
};
/** Missing evidence remains explicit in the added field. */
export function EvolutionAddedValue({
  id,
  value,
  x,
  y,
  opacity,
  isMissing,
}: Readonly<Props>): ReactNode {
  return (
    <g opacity={opacity} data-missing-value={isMissing ? id : undefined}>
      <LabelSlots labels={[[value, x + 535, y + 15, 230, 12, 3]]} />
    </g>
  );
}
