import { FitText } from "../../../primitives/FitText/FitText";
import type { Input } from "../CommunityCoordinationTable.schema";
import type { ReactNode } from "react";

type Props = {
  team: Input["teams"][number];
  y: number;
};

/** Renders the service label label with authored geometry. */
export function CoordinationTeamServiceLabel({
  team,
  y,
}: Readonly<Props>): ReactNode {
  return (
    <FitText
      text={team.serviceLabel}
      x={660}
      y={y + 47}
      width={260}
      fontSize={12}
      maxLines={3}
      breakLongWords
      normalizeWhitespace
    />
  );
}
