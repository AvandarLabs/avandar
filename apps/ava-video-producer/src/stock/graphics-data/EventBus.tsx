import { StockRect } from "../primitives/StockRect/StockRect";
import {
  Arrive,
  DrawPath,
  Eyebrow,
  Packet,
  Panel,
  STOCK,
  Text,
  type GraphicProps,
} from "../graphics-common";
import { getStockDisplayCopyFromDescriptor } from "../i18n/getStockDisplayCopyFromDescriptor/getStockDisplayCopyFromDescriptor";
import { LEGACY_DISPLAY_COPY } from "../presets/legacy/legacyDisplayCopy";
import type { EventBusInput } from "../presets/EventBus/EventBus.schema";
import type { ReactNode } from "react";

type Props = GraphicProps & { input: EventBusInput };

/** Draws the bounded authored event-bus study at an explicit frame. */
export function EventBus({ input, frame, accent }: Readonly<Props>): ReactNode {
  const producers = input.producers;
  const subscribers = input.subscribers;
  return (
    <g>
      <Eyebrow>{input.heading}</Eyebrow>
      <StockRect
        x={136}
        y={277}
        width={688}
        height={58}
        rx={29}
        fill={accent}
        fillOpacity={0.045}
        stroke={accent}
        strokeOpacity={0.35}
      />
      <path
        d="M165 306 H794"
        stroke={accent}
        strokeOpacity={0.4}
        strokeWidth={2}
      />
      {input.showPackets
        ? [0, 1, 2, 3].map((i) => (
            <Packet
              key={i}
              frame={frame}
              from={{ x: 165, y: 306 }}
              to={{ x: 794, y: 306 }}
              delay={i * 25}
              period={100}
              color={accent}
              radius={4.5}
            />
          ))
        : null}
      {producers.map((name, i) => {
        const x = 160 + i * 260;
        const center = x + 60;
        const to = { x: center, y: 277 };
        const from = { x: center, y: 193 };
        return (
          <g key={name}>
            <DrawPath
              d={`M${center} 193 V277`}
              frame={frame}
              at={23 + i * 4}
              color={STOCK.cyan}
              opacity={0.5}
            />
            {input.showPackets ? (
              <Packet
                frame={frame}
                from={from}
                to={to}
                color={STOCK.cyan}
                delay={i * 24}
                period={80}
              />
            ) : null}
            <Arrive frame={frame} index={i}>
              <Panel x={x} y={121} width={120} height={72}>
                <Text x={center} y={163} size={21} anchor="middle">
                  {name}
                </Text>
              </Panel>
            </Arrive>
            <Text
              x={center}
              y={101}
              size={11}
              fill={STOCK.muted}
              anchor="middle"
              mono
            >
              {getStockDisplayCopyFromDescriptor({
                descriptor: LEGACY_DISPLAY_COPY["event-bus"].producerNumber,
                values: { number: `0${i + 1}` },
              })}
            </Text>
          </g>
        );
      })}
      {subscribers.map((name, i) => {
        const x = 160 + i * 260;
        const center = x + 60;
        const from = { x: center, y: 335 };
        const to = { x: center, y: 418 };
        return (
          <g key={name}>
            <DrawPath
              d={`M${center} 335 V418`}
              frame={frame}
              at={35 + i * 4}
              color={STOCK.orange}
              opacity={0.45}
            />
            {input.showPackets ? (
              <Packet
                frame={frame}
                from={from}
                to={to}
                color={STOCK.orange}
                delay={i * 24 + 34}
                period={80}
              />
            ) : null}
            <Arrive frame={frame} index={i} at={26}>
              <Panel x={x} y={418} width={120} height={72}>
                <Text x={center} y={460} size={21} anchor="middle">
                  {name}
                </Text>
              </Panel>
            </Arrive>
            <Text
              x={center}
              y={520}
              size={11}
              fill={STOCK.muted}
              anchor="middle"
              mono
            >
              {getStockDisplayCopyFromDescriptor({
                descriptor: LEGACY_DISPLAY_COPY["event-bus"].subscriberNumber,
                values: { number: `0${i + 1}` },
              })}
            </Text>
          </g>
        );
      })}
    </g>
  );
}
