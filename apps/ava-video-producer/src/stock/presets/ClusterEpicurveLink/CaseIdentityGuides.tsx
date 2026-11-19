import { prop } from "@avandar/utils";
import { useGraphicMotion } from "../../theme/useGraphicTheme/useGraphicTheme";
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
  const motion = useGraphicMotion();
  const visibility =
    motion.ramp(frame, 36, motion.whip) * (1 - motion.reveal(frame, 84));
  return (
    <g opacity={visibility}>
      {getCasePositionsFromInput(input)
        .filter(prop("isInvestigated"))
        .map((position) => {
          return (
            <TravelingCase
              key={position.record.id}
              position={position}
              frame={frame}
              accent={accent}
              showGuide={input.showIdentityGuides}
            />
          );
        })}
    </g>
  );
}
