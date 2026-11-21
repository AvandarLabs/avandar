import { Text } from "../../graphics-common/Text";
import { SketchedShape } from "../../primitives/SketchedShape";
import { LANE_LABEL_SIZE } from "./PacketStream.constants";
import type { LaneTrackData } from "./PacketStream.types";
import type { ReactNode } from "react";

type Props = LaneTrackData;

/** Renders the lane track layer for PacketStream. */
export function LaneTrack(props: Readonly<Props>): ReactNode {
  return (
    <>
      <Text
        role="field"
        x={64}
        y={props.lane.y + 5}
        size={LANE_LABEL_SIZE}
        fill={props.laneColor}
      >
        {props.lane.label}
      </Text>
      <SketchedShape
        shape={{ kind: "path", d: `M230 ${props.lane.y} H805` }}
        profile={props.sketch.shape}
        stroke={props.color.line}
        strokeWidth={props.shapes.stroke(props.stroke.outline)}
      />
    </>
  );
}
