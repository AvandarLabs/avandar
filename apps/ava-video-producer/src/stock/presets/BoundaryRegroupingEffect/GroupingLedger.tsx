import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { getGroupingFromCells } from "./getGroupingFromCells";
import { GroupingZone } from "./GroupingZone";
import type { Input } from "./BoundaryRegroupingEffect.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };
/** Zone summaries change while the complete partition remains accountable. */
export function GroupingLedger({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const index = frame < 72 ? 0 : 1;
  return (
    <g>
      <LabelSlots
        labels={[[input.groupings[index].label, 60, 90, 360, 16, 3]]}
      />
      {getGroupingFromCells({ input, index }).map((zone) => (
        <GroupingZone key={zone.id} zone={zone} accent={accent} />
      ))}
    </g>
  );
}
