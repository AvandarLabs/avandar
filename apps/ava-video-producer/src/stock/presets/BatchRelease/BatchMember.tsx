import { mix, ramp } from "../../../motion";
import { StockRect } from "../../primitives/StockRect/StockRect";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
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
/** Frames a member takes to drop into its slot. */
const SETTLE_FRAMES = 12;
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
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const motion = GraphicThemeHooks.useGraphicMotion();
  // The last member lands exactly as the batch completes.
  const settle = motion.scale(SETTLE_FRAMES);
  const arriveAt =
    start + (index * (completeAt - start - settle)) / (numItems - 1);
  const progress = ramp(frame, arriveAt, settle, motion.travel.easing);
  const x = envelopeX + 15 + index * 110;
  const tokenY = mix(progress, y - 45, y + 62);
  return (
    <g opacity={ramp(frame, arriveAt, motion.chip, motion.reveal.easing)}>
      <StockRect
        data-item-id={item.id}
        data-member-of={batchId}
        x={x}
        y={tokenY}
        width={100}
        height={58}
        rx={scales.corner(tokens.corner.cell)}
        fill={tokens.color.surface}
        stroke={accent}
        strokeWidth={scales.stroke(tokens.stroke.outline)}
      />
      {showLabel ? (
        <BatchItemLabel label={item.label} x={x} y={tokenY} />
      ) : undefined}
    </g>
  );
}
