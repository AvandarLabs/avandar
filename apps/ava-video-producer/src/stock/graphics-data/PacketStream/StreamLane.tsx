import { Check } from "../../graphics-common/Check";
import { SketchedShape } from "../../primitives/SketchedShape";
import { getContentColorFromValue } from "../../theme/getContentColorFromValue/getContentColorFromValue";
import { LaneTrack } from "./LaneTrack";
import { MovingPacket } from "./MovingPacket";
import type { PacketStreamInput } from "../../presets/PacketStream/PacketStream.schema";
import type { Drawing } from "./PacketStream.types";
import type { ReactNode } from "react";

type Props = Drawing & {
  lane: Readonly<PacketStreamInput["lanes"][number] & { y: number }>;
  laneIndex: number;
};

/** Renders the stream lane layer for PacketStream. */
export function StreamLane(props: Readonly<Props>): ReactNode {
  const laneColor =
    props.laneIndex === 1
      ? props.accent
      : getContentColorFromValue({
          value: props.lane.color,
          options: { tokens: props.tokens, accent: props.accent },
        });
  const drawing = { ...props, laneColor };
  return (
    <g key={props.lane.label}>
      <LaneTrack {...drawing} />
      <g clipPath={`url(#${props.id}-stream)`}>
        {Array.from(
          { length: props.input.packetsPerLane },
          (_, packetIndex) => {
            return (
              <MovingPacket
                key={packetIndex}
                {...{ ...drawing, packetIndex }}
              />
            );
          },
        )}
      </g>
      <SketchedShape
        shape={{ kind: "circle", cx: 824, cy: props.lane.y, r: 19 }}
        profile={props.sketch.shape}
        fill={props.color.surface}
        stroke={laneColor}
        strokeOpacity={props.alpha.dimmed}
        strokeWidth={props.hairline}
      />
      {props.input.showReceipts ? (
        <Check x={824} y={props.lane.y} color={laneColor} size={14} />
      ) : null}
    </g>
  );
}
