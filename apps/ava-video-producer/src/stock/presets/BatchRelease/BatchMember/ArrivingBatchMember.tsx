import { Motion } from "../../../../motion";
import { StockRect } from "../../../primitives/StockRect";
import { BatchItemLabel } from "../BatchItemLabel";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "../BatchRelease.schema";
import type { ReactNode } from "react";

type ParentProps = {
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

type Props = {
  item: Readonly<ParentProps>["item"];
  batchId: Readonly<ParentProps>["batchId"];
  frame: Readonly<ParentProps>["frame"];
  showLabel: Readonly<ParentProps>["showLabel"];
  accent: Readonly<ParentProps>["accent"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
  motion: ReturnType<typeof GraphicThemeHooks.useGraphicMotion>;
  arriveAt: number;
  x: number;
  tokenY: number;
};

/** Renders the arriving batch member in authored paint order. */
export function ArrivingBatchMember(options: Readonly<Props>): ReactNode {
  return (
    <g
      opacity={Motion.ramp({
        frame: options.frame,
        at: options.arriveAt,
        dur: options.motion.chip,
        easing: options.motion.reveal.easing,
      })}
    >
      <StockRect
        data-item-id={options.item.id}
        data-member-of={options.batchId}
        x={options.x}
        y={options.tokenY}
        width={100}
        height={58}
        rx={options.scales.corner(options.tokens.corner.cell)}
        fill={options.tokens.color.surface}
        stroke={options.accent}
        strokeWidth={options.scales.stroke(options.tokens.stroke.outline)}
      />
      {options.showLabel ? (
        <BatchItemLabel
          label={options.item.label}
          x={options.x}
          y={options.tokenY}
        />
      ) : undefined}
    </g>
  );
}
