import { loopPhase, mix, wave } from "../../motion";
import { getStockDisplayCopyFromDescriptor } from "../copy/getStockDisplayCopyFromDescriptor/getStockDisplayCopyFromDescriptor";
import { Check } from "../graphics-common/Check";
import { Eyebrow } from "../graphics-common/Eyebrow";
import { Text } from "../graphics-common/Text";
import { LEGACY_DISPLAY_COPY } from "../presets/legacy/legacyDisplayCopy";
import { SketchedShape } from "../primitives/SketchedShape";
import { StockRect } from "../primitives/StockRect/StockRect";
import { getContentColorFromValue } from "../theme/getContentColorFromValue/getContentColorFromValue";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTheme,
  useGraphicTokens,
} from "../theme/useGraphicTheme/useGraphicTheme";
import type { GraphicProps } from "../graphics-common/graphicCommon.types";
import type { PacketStreamInput } from "../presets/PacketStream/PacketStream.schema";
import type { ReactNode } from "react";

type Props = GraphicProps & { input: PacketStreamInput };

const STREAM_PERIOD = 130;
const PACKET_PHASE_STEP = 20;
const PACKET_CORNER = 6;
const PACKET_FILL_ALPHA = 0.13;
const HEADING_SIZE = 29;
const LANE_LABEL_SIZE = 16;

/** Draws the bounded authored packet-stream study at an explicit frame. */
export function PacketStream({
  input,
  frame,
  accent,
  id,
}: Readonly<Props>): ReactNode {
  const { atomic } = useGraphicTheme();
  const tokens = useGraphicTokens();
  const { color, stroke, alpha, sketch } = tokens;
  const shapes = useGraphicShapeScales();
  const motion = useGraphicMotion();
  const hairline = shapes.stroke(stroke.hairline);
  const lanes = input.lanes.map((lane, index) => {
    return {
      ...lane,
      y: 208 + index * 102,
    };
  });
  return (
    <g>
      <defs>
        <clipPath id={`${id}-stream`}>
          <StockRect x={230} y={155} width={554} height={305} />
        </clipPath>
      </defs>
      <Eyebrow>
        {getStockDisplayCopyFromDescriptor({
          descriptor: LEGACY_DISPLAY_COPY["packet-stream"].packetStream,
        })}
      </Eyebrow>
      <Text role="title" x={64} y={112} size={HEADING_SIZE}>
        {input.heading}
      </Text>
      {lanes.map((lane, i) => {
        const laneColor =
          i === 1
            ? accent
            : getContentColorFromValue(lane.color, { tokens, accent });
        return (
          <g key={lane.label}>
            <Text
              role="field"
              x={64}
              y={lane.y + 5}
              size={LANE_LABEL_SIZE}
              fill={laneColor}
            >
              {lane.label}
            </Text>
            <SketchedShape
              shape={{ kind: "path", d: `M230 ${lane.y} H805` }}
              profile={sketch.shape}
              stroke={color.line}
              strokeWidth={shapes.stroke(stroke.outline)}
            />
            <g clipPath={`url(#${id}-stream)`}>
              {Array.from({ length: input.packetsPerLane }, (_, index) => {
                return index;
              }).map((p) => {
                const t = loopPhase(
                  frame,
                  STREAM_PERIOD,
                  lane.offset + p * (STREAM_PERIOD / input.packetsPerLane),
                );
                const x = mix(t, 188, 820);
                return (
                  <g
                    key={p}
                    opacity={
                      atomic.opacity["50"] +
                      wave(frame, motion.pulse.period, p * PACKET_PHASE_STEP) *
                        atomic.opacity["50"]
                    }
                  >
                    <StockRect
                      x={x - 35}
                      y={lane.y - 13}
                      width={62}
                      height={26}
                      rx={shapes.corner(PACKET_CORNER)}
                      fill={laneColor}
                      fillOpacity={shapes.wash(PACKET_FILL_ALPHA)}
                      stroke={laneColor}
                      strokeOpacity={atomic.opacity["65"]}
                      strokeWidth={hairline}
                    />
                    <SketchedShape
                      shape={{ kind: "path", d: `M${x - 21} ${lane.y} h23` }}
                      profile={sketch.shape}
                      stroke={laneColor}
                      strokeWidth={shapes.stroke(stroke.default)}
                    />
                    <circle cx={x + 14} cy={lane.y} r={2.5} fill={laneColor} />
                  </g>
                );
              })}
            </g>
            <SketchedShape
              shape={{ kind: "circle", cx: 824, cy: lane.y, r: 19 }}
              profile={sketch.shape}
              fill={color.surface}
              stroke={laneColor}
              strokeOpacity={alpha.dimmed}
              strokeWidth={hairline}
            />
            {input.showReceipts ? (
              <Check x={824} y={lane.y} color={laneColor} size={14} />
            ) : null}
          </g>
        );
      })}
      <SketchedShape
        shape={{ kind: "line", x1: 64, y1: 495, x2: 896, y2: 495 }}
        profile={sketch.shape}
        stroke={color.line}
        strokeWidth={hairline}
      />
      <Text role="meta" x={64} y={538}>
        {getStockDisplayCopyFromDescriptor({
          descriptor: LEGACY_DISPLAY_COPY["packet-stream"].produce,
        })}
      </Text>
      <Text role="meta" x={480} y={538} anchor="middle">
        {getStockDisplayCopyFromDescriptor({
          descriptor: LEGACY_DISPLAY_COPY["packet-stream"].transport,
        })}
      </Text>
      <Text role="meta" x={896} y={538} anchor="end">
        {getStockDisplayCopyFromDescriptor({
          descriptor: LEGACY_DISPLAY_COPY["packet-stream"].receive,
        })}
      </Text>
    </g>
  );
}
