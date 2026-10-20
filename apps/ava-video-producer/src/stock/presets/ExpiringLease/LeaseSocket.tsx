import { ramp } from "../../../motion";
import { FitText } from "../../primitives/FitText/FitText";
import { STOCK } from "../../stockPalette";
import { getSocketPointFromIndex } from "./getSocketPointFromIndex";
import { LeaseCollar } from "./LeaseCollar";
import type { Input } from "./ExpiringLease.schema";
import type { ReactNode } from "react";
type Props = {
  participant: Input["participants"][number];
  index: number;
  input: Input;
  frame: number;
  accent: string;
};
const LABEL = {
  y: 100,
  width: 170,
  fontSize: 12 as const,
  maxLines: 3,
  anchor: "middle" as const,
  breakLongWords: true,
  normalizeWhitespace: true,
} satisfies Pick<
  Parameters<typeof FitText>[0],
  | "y"
  | "width"
  | "fontSize"
  | "maxLines"
  | "anchor"
  | "breakLongWords"
  | "normalizeWhitespace"
>;
/** Expiry opens a socket while preserving its previous empty location. */
export function LeaseSocket({
  participant,
  index,
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const { x, y } = getSocketPointFromIndex({
    index,
    numParticipants: input.participants.length,
  });
  const isHolder = participant.id === input.holderId;
  const opening = isHolder ? ramp(frame, 108, 8) : 0;
  const socket = {
    cx: x,
    cy: y,
    r: 32,
    fill: STOCK.surface,
    stroke: STOCK.cyan,
    strokeWidth: 3,
    pathLength: 1,
    strokeDasharray: 1,
    strokeDashoffset: opening * 0.3,
  };
  const collarProps = { input, frame, x, y, accent };
  return (
    <g opacity={ramp(frame, 14 + index * 2, 12)}>
      <circle
        data-socket={participant.id}
        data-socket-owner={isHolder && frame < 108 ? participant.id : undefined}
        {...socket}
      />
      {isHolder && input.showLifetime ? (
        <LeaseCollar {...collarProps} />
      ) : undefined}
      {input.showLabels ? (
        <FitText {...LABEL} text={participant.label} x={x} />
      ) : undefined}
    </g>
  );
}
