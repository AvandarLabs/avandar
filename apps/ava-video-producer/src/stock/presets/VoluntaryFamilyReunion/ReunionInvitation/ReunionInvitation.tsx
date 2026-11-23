import { FitText } from "../../../primitives/FitText/FitText";
import { StockRect } from "../../../primitives/StockRect";
import { ReunionAcceptance } from "./ReunionAcceptance";
import { useReunionInvitationPresentation } from "./useReunionInvitationPresentation";
import type { Input } from "../VoluntaryFamilyReunion.schema.ts";
import type { ReactNode } from "react";

type Props = {
  input: Input;
  groupIndex: number;
  frame: number;
  accent: string;
};
/** Separate accepted invitations stay with the two authored groups. */
export function ReunionInvitation(props: Readonly<Props>): ReactNode {
  const presentation = useReunionInvitationPresentation(props);

  return (
    <g
      data-invitation={props.input.groups[props.groupIndex].id}
      data-accepted={presentation.accepted}
    >
      <StockRect
        x={presentation.x}
        y={194}
        width={220}
        height={116}
        rx={presentation.scales.corner(6)}
        fill={presentation.tokens.color.surface}
        stroke={
          presentation.accepted ? props.accent : presentation.tokens.color.line
        }
      />
      <FitText
        text={props.input.invitationLabels.heading}
        x={presentation.x + 14}
        y={216}
        width={192}
        fontSize={12}
        maxLines={3}
        breakLongWords
        normalizeWhitespace
      />
      {presentation.accepted ? (
        <ReunionAcceptance {...presentation} />
      ) : undefined}
    </g>
  );
}
