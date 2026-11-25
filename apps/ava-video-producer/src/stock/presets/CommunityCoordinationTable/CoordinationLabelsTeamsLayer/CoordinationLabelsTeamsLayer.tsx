import { CoordinationTeamCopy } from "../CoordinationTeamCopy";
import type { Input } from "../CommunityCoordinationTable.schema";
import type { ReactNode } from "react";

type Props = {
  input: Input;
  frame: number;
  accent: string;
};

/** Renders the teams layer with authored geometry. */
export function CoordinationLabelsTeamsLayer({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <>
      {input.teams.map((team, index) => {
        return (
          <CoordinationTeamCopy
            key={team.id}
            {...{ input, index, frame, accent }}
          />
        );
      })}
    </>
  );
}
