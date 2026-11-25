import { Motion } from "../../../../motion";
import { FitText } from "../../../primitives/FitText/FitText";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { getSocketPointFromIndex } from "../getSocketPointFromIndex";
import { LeaseCollar } from "../LeaseCollar";
import { EXPIRY_CUE } from "../leaseShape";
import { SocketRing } from "./SocketRing";
import type { Input } from "../ExpiringLease.schema";
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
/** Frames the holder's socket takes to open at expiry. */
const OPEN_FRAMES = 8;
/** Expiry opens a socket while preserving its previous empty location. */
export function LeaseSocket({
  participant,
  index,
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const motion = GraphicThemeHooks.useGraphicMotion();
  const { x, y } = getSocketPointFromIndex({
    index,
    numParticipants: input.participants.length,
  });
  const isHolder = participant.id === input.holderId;
  const opening = isHolder
    ? Motion.ramp({
        frame,
        at: EXPIRY_CUE,
        dur: motion.scale(OPEN_FRAMES),
        easing: motion.exit.easing,
      })
    : 0;
  const collarProps = { input, frame, x, y, accent };
  return (
    <g opacity={motion.reveal(frame, 14 + index * motion.stagger.list)}>
      <g
        data-socket={participant.id}
        data-socket-owner={
          isHolder && frame < EXPIRY_CUE ? participant.id : undefined
        }
      >
        <SocketRing x={x} y={y} opening={opening} />
      </g>
      {isHolder && input.showLifetime ? (
        <LeaseCollar {...collarProps} />
      ) : undefined}
      {input.showLabels ? (
        <FitText {...LABEL} text={participant.label} x={x} />
      ) : undefined}
    </g>
  );
}
