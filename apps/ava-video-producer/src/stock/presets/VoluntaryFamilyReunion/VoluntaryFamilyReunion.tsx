import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { InvitationAndGroupMembers } from "./InvitationAndGroupMembers";
import { MeetingPlaceAndLabel } from "./MeetingPlaceAndLabel";
import { ReunionGroupCaption } from "./ReunionGroupCaption";
import { ReunionScenarioCaption } from "./ReunionScenarioCaption";
import { DEFAULT_INPUT } from "./VoluntaryFamilyReunion.fixtures";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { Input } from "./VoluntaryFamilyReunion.schema";
import type { ReactNode } from "react";

type Props = GraphicProps & { input: Input };

/**
 * Independent voluntary acceptance precedes travel and an individual greeting.
 */
export function VoluntaryFamilyReunion({
  input = DEFAULT_INPUT,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const numMembers = input.groups.reduce((sum, group) => {
    return sum + group.members.length;
  }, 0);
  const halfWidth = (numMembers - 1) * 45 + 35;
  return (
    <g>
      <MeetingPlaceAndLabel
        input={input}
        tokens={tokens}
        scales={scales}
        halfWidth={halfWidth}
      />
      {input.groups.map((group, groupIndex) => {
        return (
          <g key={group.id}>
            <ReunionGroupCaption group={group} groupIndex={groupIndex} />
            <InvitationAndGroupMembers
              input={input}
              frame={frame}
              accent={accent}
              tokens={tokens}
              group={group}
              groupIndex={groupIndex}
            />
          </g>
        );
      })}
      <ReunionScenarioCaption input={input} />
    </g>
  );
}
