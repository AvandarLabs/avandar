import { ProducerConnection } from "./ProducerConnection";
import { ProducerOrdinal } from "./ProducerOrdinal";
import type { BusProducerData } from "./EventBus.types";
import type { ReactNode } from "react";

type Props = BusProducerData;

/** Renders the bus producer layer for EventBus. */
export function BusProducer({
  input,
  frame,
  color,
  alpha,
  name,
  i,
}: Readonly<Props>): ReactNode {
  const x = 160 + i * 260;
  const center = x + 60;
  const to = { x: center, y: 277 };
  const from = { x: center, y: 193 };
  return (
    <g key={name}>
      <ProducerConnection
        {...{
          input,
          frame,
          color,
          alpha,
          name,
          i,
          x,
          center,
          to,
          from,
        }}
      />
      <ProducerOrdinal {...{ i, center }} />
    </g>
  );
}
