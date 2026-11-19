import { propEq } from "@avandar/utils";
import { mix, ramp } from "../../../motion";
import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { getSocketPointFromIndex } from "./getSocketPointFromIndex";
import { LeaseCaptions } from "./LeaseCaptions";
import { EXPIRY_CUE } from "./leaseShape";
import { LeaseSocket } from "./LeaseSocket";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { Input } from "./ExpiringLease.schema";
import type { ReactNode } from "react";

type Props = GraphicProps & { input: Input };
const DOCK = { kind: "circle", cx: 480, cy: 430, r: 34 } as const;
/** The dash of the route back to the dock. */
const ROUTE_DASH = "4 8";
/** Frames the token takes to return to the dock. */
const RETURN_FRAMES = 28;
/** One token expires into neutral custody without inferring a successor. */
export function ExpiringLease({
  frame,
  accent,
  input,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
  const motion = useGraphicMotion();
  const holderIndex = input.participants.findIndex(
    propEq("id", input.holderId),
  );
  const holder = getSocketPointFromIndex({
    index: holderIndex,
    numParticipants: input.participants.length,
  });
  const returning = ramp(
    frame,
    EXPIRY_CUE,
    motion.scale(RETURN_FRAMES),
    motion.travel.easing,
  );

  const token = {
    cx: mix(returning, holder.x, 480),
    cy: mix(returning, holder.y, 430),
    r: 12,
    fill: accent,
    opacity: motion.reveal(frame, 18),
  };
  const socketProps = { input, frame, accent };
  return (
    <g>
      <g data-neutral-dock="pool">
        <SketchedShape
          shape={DOCK}
          profile={tokens.sketch.shape}
          fill={tokens.color.surface}
          stroke={tokens.color.line}
          strokeWidth={scales.stroke(tokens.stroke.emphasis)}
          opacity={motion.reveal(frame, 12)}
        />
      </g>
      <SketchedShape
        shape={{ kind: "path", d: `M${holder.x} ${holder.y} L480 430` }}
        profile={tokens.sketch.shape}
        fill="none"
        stroke={tokens.color.line}
        strokeWidth={scales.stroke(tokens.stroke.default)}
        strokeDasharray={ROUTE_DASH}
        opacity={motion.reveal(frame, 24)}
      />
      {input.participants.map((participant, index) => {
        return (
          <LeaseSocket
            key={participant.id}
            participant={participant}
            index={index}
            {...socketProps}
          />
        );
      })}
      <circle data-permission-token="single" {...token} />
      {input.showLabels ? (
        <LeaseCaptions input={input} frame={frame} />
      ) : undefined}
    </g>
  );
}
