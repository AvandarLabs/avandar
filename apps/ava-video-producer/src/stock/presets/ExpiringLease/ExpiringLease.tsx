import { propEq } from "@avandar/utils";
import { EASE, mix, ramp } from "../../../motion";
import { STOCK } from "../../stockPalette";
import { getSocketPointFromIndex } from "./getSocketPointFromIndex";
import { LeaseCaptions } from "./LeaseCaptions";
import { LeaseSocket } from "./LeaseSocket";
import type { GraphicProps } from "../../graphics-common";
import type { Input } from "./ExpiringLease.schema";
import type { ComponentProps, ReactNode } from "react";
type Props = GraphicProps & { input: Input };
const DOCK = {
  cx: 480,
  cy: 430,
  r: 34,
  fill: STOCK.surface,
  stroke: STOCK.line,
  strokeWidth: 3,
} satisfies Pick<
  ComponentProps<"circle">,
  "cx" | "cy" | "r" | "fill" | "stroke" | "strokeWidth"
>;
const ROUTE = {
  fill: "none",
  stroke: STOCK.line,
  strokeWidth: 2,
  strokeDasharray: "4 8",
} satisfies Pick<
  ComponentProps<"path">,
  "fill" | "stroke" | "strokeWidth" | "strokeDasharray"
>;
/** One token expires into neutral custody without inferring a successor. */
export function ExpiringLease({
  frame,
  accent,
  input,
}: Readonly<Props>): ReactNode {
  const holderIndex = input.participants.findIndex(
    propEq("id", input.holderId),
  );
  const holder = getSocketPointFromIndex({
    index: holderIndex,
    numParticipants: input.participants.length,
  });
  const returning = ramp(frame, 108, 28, EASE.inOut);
  const route = {
    d: `M${holder.x} ${holder.y} L480 430`,
    ...ROUTE,
    opacity: ramp(frame, 24, 12),
  };
  const token = {
    cx: mix(returning, holder.x, 480),
    cy: mix(returning, holder.y, 430),
    r: 12,
    fill: accent,
    opacity: ramp(frame, 18, 12),
  };
  const socketProps = { input, frame, accent };
  return (
    <g>
      <circle
        data-neutral-dock="pool"
        {...DOCK}
        opacity={ramp(frame, 12, 12)}
      />
      <path {...route} />
      {input.participants.map((participant, index) => (
        <LeaseSocket
          key={participant.id}
          participant={participant}
          index={index}
          {...socketProps}
        />
      ))}
      <circle data-permission-token="single" {...token} />
      {input.showLabels ? (
        <LeaseCaptions input={input} frame={frame} />
      ) : undefined}
    </g>
  );
}
