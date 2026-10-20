import { StockRect } from "../primitives/StockRect/StockRect";
import { loopPhase, mix, wave } from "../../motion";
import {
  Check,
  Eyebrow,
  STOCK,
  Text,
  type GraphicProps,
} from "../graphics-common";
import { getStockDisplayCopyFromDescriptor } from "../i18n/getStockDisplayCopyFromDescriptor/getStockDisplayCopyFromDescriptor";
import { LEGACY_DISPLAY_COPY } from "../presets/legacy/legacyDisplayCopy";
import type { PacketStreamInput } from "../presets/PacketStream/PacketStream.schema";
import type { ReactNode } from "react";

type Props = GraphicProps & { input: PacketStreamInput };

/** Draws the bounded authored packet-stream study at an explicit frame. */
export function PacketStream({
  input,
  frame,
  accent,
  id,
}: Readonly<Props>): ReactNode {
  const lanes = input.lanes.map((lane, index) => ({
    ...lane,
    y: 208 + index * 102,
  }));
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
      <Text x={64} y={112} size={29} weight={600}>
        {input.heading}
      </Text>
      {lanes.map((lane, i) => {
        const color = i === 1 ? accent : lane.color;
        return (
          <g key={lane.label}>
            <Text x={64} y={lane.y + 5} size={16} mono fill={color}>
              {lane.label}
            </Text>
            <path
              d={`M230 ${lane.y} H805`}
              stroke={STOCK.line}
              strokeWidth={1.5}
            />
            <g clipPath={`url(#${id}-stream)`}>
              {Array.from(
                { length: input.packetsPerLane },
                (_, index) => index,
              ).map((p) => {
                const t = loopPhase(
                  frame,
                  130,
                  lane.offset + p * (130 / input.packetsPerLane),
                );
                const x = mix(t, 188, 820);
                return (
                  <g key={p} opacity={0.5 + wave(frame, 90, p * 20) * 0.5}>
                    <StockRect
                      x={x - 35}
                      y={lane.y - 13}
                      width={62}
                      height={26}
                      rx={6}
                      fill={color}
                      fillOpacity={0.13}
                      stroke={color}
                      strokeOpacity={0.65}
                    />
                    <path
                      d={`M${x - 21} ${lane.y} h23`}
                      stroke={color}
                      strokeWidth={2}
                    />
                    <circle cx={x + 14} cy={lane.y} r={2.5} fill={color} />
                  </g>
                );
              })}
            </g>
            <circle
              cx={824}
              cy={lane.y}
              r={19}
              fill={STOCK.surface}
              stroke={color}
              strokeOpacity={0.4}
            />
            {input.showReceipts ? (
              <Check x={824} y={lane.y} color={color} size={14} />
            ) : null}
          </g>
        );
      })}
      <line x1={64} y1={495} x2={896} y2={495} stroke={STOCK.line} />
      <Text x={64} y={538} size={15} fill={STOCK.muted} mono>
        {getStockDisplayCopyFromDescriptor({
          descriptor: LEGACY_DISPLAY_COPY["packet-stream"].produce,
        })}
      </Text>
      <Text x={480} y={538} size={15} fill={STOCK.muted} mono anchor="middle">
        {getStockDisplayCopyFromDescriptor({
          descriptor: LEGACY_DISPLAY_COPY["packet-stream"].transport,
        })}
      </Text>
      <Text x={896} y={538} size={15} fill={STOCK.muted} mono anchor="end">
        {getStockDisplayCopyFromDescriptor({
          descriptor: LEGACY_DISPLAY_COPY["packet-stream"].receive,
        })}
      </Text>
    </g>
  );
}
