import { prop } from "@avandar/utils";
import { ramp } from "../../../motion";
import { getCasePositionsFromInput } from "./getCasePositionsFromInput";
import type { Input } from "./ClusterEpicurveLink.schema";
import type { ReactNode } from "react";
type Props = { input: Input; frame: number; accent: string };
/**
 * An authored investigation bracket encloses only the selected coordinate
 * extent.
 */
export function InvestigationBracket({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const selected = getCasePositionsFromInput(input).filter(
    prop("isInvestigated"),
  );
  const left = Math.min(...selected.map(prop("mapX"))) - 10;
  const right = Math.max(...selected.map(prop("mapX"))) + 10;
  const top = Math.min(...selected.map(prop("mapY"))) - 12;
  const bottom = Math.max(...selected.map(prop("mapY"))) + 12;
  return (
    <path
      data-investigation-bracket=""
      d={`M${left + 8} ${top} H${left} V${bottom} H${left + 8} M${right - 8} ${top} H${right} V${bottom} H${right - 8}`}
      fill="none"
      stroke={accent}
      strokeWidth={2}
      opacity={ramp(frame, 24, 12)}
    />
  );
}
