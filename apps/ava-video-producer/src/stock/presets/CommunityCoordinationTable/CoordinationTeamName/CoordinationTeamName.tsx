import { FitText } from "../../../primitives/FitText/FitText";
import type { Input } from "../CommunityCoordinationTable.schema";
import type { ReactNode } from "react";

type Props = {
  team: Input["teams"][number];
  y: number;
};

/** Renders the label label with authored geometry. */
export function CoordinationTeamName({ team, y }: Readonly<Props>): ReactNode {
  return (
    <FitText
      text={team.label}
      x={660}
      y={y}
      width={260}
      fontSize={12}
      maxLines={3}
      breakLongWords
      normalizeWhitespace
    />
  );
}
