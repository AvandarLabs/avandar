import { ramp } from "../../../motion";
import { FitText } from "../../primitives/FitText/FitText";
import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { getSocketPointFromIndex } from "./getSocketPointFromIndex";
import { LeaseCollar } from "./LeaseCollar";
import { EXPIRY_CUE } from "./leaseShape";
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
/** Frames the holder's socket takes to open at expiry. */
const OPEN_FRAMES = 8;
/** The share of the socket's outline that opens. */
const OPEN_GAP = 0.3;
/** The socket's normalized path length, which its dash spans. */
const SOCKET_LENGTH = 1;

/** Expiry opens a socket while preserving its previous empty location. */
export function LeaseSocket({
  participant,
  index,
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const motion = useGraphicMotion();
  const { x, y } = getSocketPointFromIndex({
    index,
    numParticipants: input.participants.length,
  });
  const isHolder = participant.id === input.holderId;
  const opening = isHolder
    ? ramp(frame, EXPIRY_CUE, motion.scale(OPEN_FRAMES), motion.exit.easing)
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

/** The socket's ring, its outline opening by `opening` at expiry. */
function SocketRing({
  x,
  y,
  opening,
}: Readonly<{ x: number; y: number; opening: number }>): ReactNode {
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
  return (
    <SketchedShape
      shape={{ kind: "circle", cx: x, cy: y, r: 32 }}
      profile={tokens.sketch.shape}
      fill={tokens.color.surface}
      stroke={tokens.color.accentAlt}
      strokeWidth={scales.stroke(tokens.stroke.emphasis)}
      pathLength={SOCKET_LENGTH}
      strokeDasharray={SOCKET_LENGTH}
      strokeDashoffset={SOCKET_LENGTH * opening * OPEN_GAP}
    />
  );
}
