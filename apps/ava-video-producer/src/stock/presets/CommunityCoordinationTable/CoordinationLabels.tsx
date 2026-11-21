import { FitText } from "../../primitives/FitText/FitText";
import { CoordinationContextLabels } from "./CoordinationContextLabels/CoordinationContextLabels";
import { CoordinationLabelsPlacesLayer } from "./CoordinationLabelsPlacesLayer/CoordinationLabelsPlacesLayer";
import { CoordinationLabelsTeamsLayer } from "./CoordinationLabelsTeamsLayer/CoordinationLabelsTeamsLayer";
import { CoordinationOpenRequests } from "./CoordinationOpenRequests/CoordinationOpenRequests";
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
      <CoordinationLabelsPlacesLayer {...{ input, frame, accent }} />
      <CoordinationLabelsTeamsLayer {...{ input, frame, accent }} />
      {input.showUnassignedRequests && frame >= 108 ? (
        <CoordinationOpenRequests input={input} accent={accent} />
      ) : undefined}
      <CoordinationContextLabels input={input} />
    </g>
  );
}
