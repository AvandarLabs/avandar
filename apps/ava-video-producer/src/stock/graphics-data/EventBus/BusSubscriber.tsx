import { SubscriberConnection } from "./SubscriberConnection";
import { SubscriberOrdinal } from "./SubscriberOrdinal";
import type { BusSubscriberData } from "./EventBus.types";
import type { ReactNode } from "react";

type Props = BusSubscriberData;

/** Renders the bus subscriber layer for EventBus. */
export function BusSubscriber({
  input,
  frame,
  atomic,
  color,
  name,
  i,
}: Readonly<Props>): ReactNode {
  const x = 160 + i * 260;
  const center = x + 60;
  const from = { x: center, y: 335 };
  const to = { x: center, y: 418 };
  return (
    <g key={name}>
      <SubscriberConnection
        {...{
          input,
          frame,
          atomic,
          color,
          name,
          i,
          x,
          center,
          from,
          to,
        }}
      />
      <SubscriberOrdinal {...{ i, center }} />
    </g>
  );
}
