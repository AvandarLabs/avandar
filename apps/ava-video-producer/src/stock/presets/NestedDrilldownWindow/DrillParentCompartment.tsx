import { mix } from "../../../motion";
import { LiteralDataText } from "../../primitives/LiteralDataText/LiteralDataText";
import { STOCK } from "../../stockPalette";
import type { ReactNode } from "react";

type Props = {
  group: string;
  index: number;
  isSelected: boolean;
  retainContext: boolean;
  progress: number;
  accent: string;
};
/** Parent groups shrink into a context strip without changing membership. */
export function DrillParentCompartment({
  group,
  index,
  isSelected,
  retainContext,
  progress,
  accent,
}: Readonly<Props>): ReactNode {
  if (!retainContext && !isSelected && progress === 1) {
    return undefined;
  }
  return (
    <g
      opacity={isSelected ? 1 : mix(progress, 1, retainContext ? 0.45 : 0)}
      data-parent-context={retainContext && progress === 1 ? group : undefined}
    >
      <rect
        data-parent-group={group}
        x={44 + index * 292}
        y={174}
        width={284}
        height={mix(progress, 390, 62)}
        rx={6}
        fill={STOCK.surface}
        stroke={isSelected ? accent : STOCK.line}
      />
      <LiteralDataText value={group} x={56 + index * 292} y={196} />
    </g>
  );
}
