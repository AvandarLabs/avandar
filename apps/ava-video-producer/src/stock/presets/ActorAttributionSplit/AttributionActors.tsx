import { propEq } from "@avandar/utils";
import { EASE, mix, ramp } from "../../../motion";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { STOCK } from "../../stockPalette";
import { AttributionCollaborator } from "./AttributionCollaborator";
import type { Input } from "./ActorAttributionSplit.schema";
import type { ReactNode } from "react";
type Props = { frame: number; input: Input; accent: string };
/** Supplied collaborators, the retired shared stamp and distinct new stamps. */
export function AttributionActors({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  const separation = ramp(frame, 61, 34, EASE.inOut);
  const shared = input.accounts.find(propEq("id", input.sharedAccountId))!;
  return (
    <g>
      {input.collaborators.map((person, index) => (
        <AttributionCollaborator
          key={person.id}
          person={person}
          index={index}
          input={input}
          separation={separation}
          accent={accent}
        />
      ))}
      <g
        data-shared-stamp="true"
        transform={`translate(300 ${mix(separation, 245, 490)})`}
      >
        <rect
          width={215}
          height={60}
          rx={6}
          fill={STOCK.surface}
          stroke={STOCK.muted}
        />
        <LabelSlots labels={[[shared.label, 12, 22, 190, 12, 3]]} />
      </g>
    </g>
  );
}
