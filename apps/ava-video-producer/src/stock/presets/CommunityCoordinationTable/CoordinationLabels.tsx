import { FitText } from "../../primitives/FitText/FitText";
import { CoordinationOpenRequests } from "./CoordinationOpenRequests";
import { CoordinationPlaceCopy } from "./CoordinationPlaceCopy";
import { CoordinationTeamCopy } from "./CoordinationTeamCopy";
import type { Input } from "./CommunityCoordinationTable.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };
/** Keyed request and assignment rails retain complete authored labels. */
export function CoordinationLabels({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      <FitText
        text={frame >= 108 ? input.planLabels.agreed : input.planLabels.initial}
        x={50}
        y={60}
        width={860}
        fontSize={16}
        maxLines={2}
        breakLongWords
        normalizeWhitespace
      />
      {input.places.map((place, index) => (
        <CoordinationPlaceCopy
          key={place.id}
          place={place}
          index={index}
          frame={frame}
          accent={accent}
        />
      ))}
      {input.teams.map((team, index) => (
        <CoordinationTeamCopy
          key={team.id}
          input={input}
          index={index}
          frame={frame}
          accent={accent}
        />
      ))}
      {input.showUnassignedRequests && frame >= 108 ? (
        <CoordinationOpenRequests input={input} accent={accent} />
      ) : undefined}
      <FitText
        text={input.communityLabel}
        x={340}
        y={530}
        width={580}
        fontSize={14}
        maxLines={2}
        breakLongWords
        normalizeWhitespace
      />
      <FitText
        text={input.scenarioCaption}
        x={40}
        y={579}
        width={880}
        fontSize={12}
        maxLines={2}
        breakLongWords
        normalizeWhitespace
      />
    </g>
  );
}
