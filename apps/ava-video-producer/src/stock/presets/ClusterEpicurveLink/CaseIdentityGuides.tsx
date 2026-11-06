import { prop } from "@avandar/utils";
import { ramp } from "../../../motion";
import { getCasePositionsFromInput } from "./getCasePositionsFromInput";
import { TravelingCase } from "./TravelingCase";
import type { Input } from "./ClusterEpicurveLink.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };
/**
 * Temporary identity copies join a map pin only to its own histogram segment.
 */
export function CaseIdentityGuides({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const visibility = ramp(frame, 36, 8) * (1 - ramp(frame, 84, 12));
  return (
    <g opacity={visibility}>
      {getCasePositionsFromInput(input)
        .filter(prop("isInvestigated"))
        .map((position) => (
          <TravelingCase
            key={position.record.id}
            position={position}
            frame={frame}
            accent={accent}
            showGuide={input.showIdentityGuides}
          />
        ))}
    </g>
  );
}
