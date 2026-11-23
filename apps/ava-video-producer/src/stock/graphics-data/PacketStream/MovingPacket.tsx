import { Motion } from "../../../motion";
import { PacketGlyph } from "./PacketGlyph";
import { STREAM_PERIOD, PACKET_PHASE_STEP } from "./PacketStream.constants";
import type { LaneTrackData } from "./PacketStream.types";
import type { ReactNode } from "react";

type Props = LaneTrackData & { packetIndex: number };

/** Renders the moving packet layer for PacketStream. */
export function MovingPacket(props: Readonly<Props>): ReactNode {
  const phase = Motion.loopPhase({
    frame: props.frame,
    period: STREAM_PERIOD,
    offset:
      props.lane.offset +
      props.packetIndex * (STREAM_PERIOD / props.input.packetsPerLane),
  });
  const x = Motion.mix({ t: phase, from: 188, to: 820 });
  const opacity =
    props.atomic.opacity["50"] +
    Motion.wave({
      frame: props.frame,
      period: props.motion.pulse.period,
      offset: props.packetIndex * PACKET_PHASE_STEP,
    }) *
      props.atomic.opacity["50"];
  return (
    <g key={props.packetIndex} opacity={opacity}>
      <PacketGlyph {...{ ...props, x }} />
    </g>
  );
}
