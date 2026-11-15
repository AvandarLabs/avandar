import { mix, ramp, EASE } from "../../../motion";
import { STOCK } from "../../stockPalette";
import { BatchItemLabel } from "./BatchItemLabel";
import type { Input } from "./BatchRelease.schema";
import type { ReactNode } from "react";

type Props = {
  item: Input["batches"][number]["items"][number];
  batchId: string;
  index: number;
  numItems: number;
  frame: number;
  start: number;
  completeAt: number;
  envelopeX: number;
  y: number;
  showLabel: boolean;
  accent: string;
};
/** One supplied member remains visible inside its own handling boundary. */
export function BatchMember({
  item,
  batchId,
  index,
  numItems,
  frame,
  start,
  completeAt,
  envelopeX,
  y,
  showLabel,
  accent,
}: Readonly<Props>): ReactNode {
  const arriveAt = start + (index * (completeAt - start - 12)) / (numItems - 1);
  const progress = ramp(frame, arriveAt, 12, EASE.inOut);
  const x = envelopeX + 15 + index * 110;
  const tokenY = mix(progress, y - 45, y + 62);
  return (
    <g opacity={ramp(frame, arriveAt, 6)}>
      <rect
        data-item-id={item.id}
        data-member-of={batchId}
        x={x}
        y={tokenY}
        width={100}
        height={58}
        rx={8}
        fill={STOCK.surface}
        stroke={accent}
        strokeWidth={1.5}
      />
      {showLabel ? (
        <BatchItemLabel label={item.label} x={x} y={tokenY} />
      ) : undefined}
    </g>
  );
}
