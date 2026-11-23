import { CoordinationMarker } from "../CoordinationMarker";
import type { CommunityCoordinationTable } from "../CommunityCoordinationTable";
import type { ReactNode } from "react";

type Props = {
  input: Parameters<typeof CommunityCoordinationTable>[0]["input"];
  frame: Parameters<typeof CommunityCoordinationTable>[0]["frame"];
  accent: Parameters<typeof CommunityCoordinationTable>[0]["accent"];
};

/** Renders the teams layer with authored geometry. */
export function CommunityCoordinationTableTeamsLayer({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <>
      {input.teams.map((team, index) => {
        return (
          <CoordinationMarker
            key={team.id}
            {...{ index, input, frame, accent }}
          />
        );
      })}
    </>
  );
}
