import { ramp, mix, EASE } from "../../../motion";
import { PersonGlyph } from "../../primitives/PersonGlyph/PersonGlyph";
import { STOCK } from "../../stockPalette";
import { makeObservationLayoutFromInput } from "./makeObservationLayoutFromInput";
import type { Input } from "./EnvironmentalObservationGaps.schema";
import type { ReactNode } from "react";
function _getTeamPosition({
  frame,
  input,
}: Readonly<{ frame: number; input: Input }>) {
  const { checks } = makeObservationLayoutFromInput(input);
  const index = Math.min(
    checks.length - 1,
    Math.max(0, Math.floor((frame - 56) / 18)),
  );
  const check = checks[index];
  if (!check) {
    return undefined;
  }
  const previous = checks[index - 1];
  const start = 56 + index * 18;
  const returnProgress = ramp(frame, start, 4, EASE.inOut),
    vertical = ramp(frame, start + 4, 4, EASE.inOut),
    approach = ramp(frame, start + 8, 4, EASE.inOut),
    reach = ramp(frame, start + 12, 2, EASE.inOut);
  const departureX = previous ? previous.x - 20 : 235;
  const x =
    frame < start + 4
      ? mix(returnProgress, departureX, 235)
      : mix(approach, 235, check.x - 20);
  const y = mix(vertical, previous?.y ?? check.y, check.y);
  return { x, y, handX: x + mix(reach, 6, 20), check, index, reach };
}
/** Inputs for ObservationFieldTeam. */
type Props = { frame: number; input: Input };

/**
 * One team member places each point, travelling only along reserved sampling
 * bands.
 */
export function ObservationFieldTeam({
  frame,
  input,
}: Readonly<Props>): ReactNode {
  const position = _getTeamPosition({ frame, input });
  if (!position) {
    return undefined;
  }
  const { x, y, handX, check, reach } = position;
  return (
    <g
      opacity={ramp(frame, 54, 4)}
      data-team-position="true"
      data-x={x}
      data-y={y}
    >
      <PersonGlyph
        x={x}
        y={y}
        size={16}
        role="participant"
        color={STOCK.orange}
      />
      <path
        d={`M ${x + 3} ${y} L ${handX} ${y}`}
        stroke={STOCK.orange}
        strokeWidth={2}
        fill="none"
      />
      <circle
        data-sampling-hand="true"
        data-target={check.id}
        cx={handX}
        cy={y}
        r={2}
        fill={STOCK.orange}
      />
      {reach > 0 ? (
        <circle
          cx={handX}
          cy={y}
          r={4 * reach}
          fill={STOCK.orange}
          fillOpacity={0.3}
        />
      ) : undefined}
    </g>
  );
}
