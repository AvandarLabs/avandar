import { propEq } from "@avandar/utils";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { STOCK } from "../../stockPalette";
import type { Input } from "./ActorAttributionSplit.schema";
import type { ReactNode } from "react";

type Props = {
  person: Input["collaborators"][number];
  index: number;
  input: Input;
  separation: number;
  accent: string;
};
/** A fictional actor retains its identity beside its assigned account stamp. */
export function AttributionCollaborator({
  person,
  index,
  input,
  separation,
  accent,
}: Readonly<Props>): ReactNode {
  const y = 170 + index * 160;
  const account = input.accounts.find(
    propEq("id", person.individualAccountId),
  )!;
  return (
    <g data-collaborator={person.id}>
      <circle cx={85} cy={y} r={18} fill={STOCK.surface} stroke={accent} />
      <path
        d={`M65 ${y + 50} V${y + 30} Q85 ${y + 10} 105 ${y + 30} V${y + 50}`}
        fill="none"
        stroke={accent}
        strokeWidth={3}
      />
      <LabelSlots labels={[[person.label, 45, y + 67, 225, 12, 3]]} />
      <g opacity={separation} transform={`translate(300 ${y - 30})`}>
        <rect
          width={215}
          height={60}
          rx={6}
          fill={STOCK.surface}
          stroke={accent}
        />
        <LabelSlots labels={[[account.label, 12, 22, 190, 12, 3]]} />
      </g>
    </g>
  );
}
