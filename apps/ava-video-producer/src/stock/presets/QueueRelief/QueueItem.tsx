import { FitText } from "../../primitives/FitText/FitText";
import { StockRect } from "../../primitives/StockRect/StockRect";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { getQueueItemLayoutFromInputAndFrame } from "./getQueueItemLayoutFromInputAndFrame";
import type { Input } from "./QueueRelief.schema";
import type { ReactNode } from "react";

type Props = {
  input: Input;
  item: Input["items"][number];
  index: number;
  frame: number;
  accent: string;
};
/** Every supplied item has one persistent, independently seekable token. */
export function QueueItem({
  input,
  item,
  index,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const motion = useGraphicMotion();
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
  const { x, y, state, serviceSlot, opacity } =
    getQueueItemLayoutFromInputAndFrame({ motion, input, index, frame });
  return (
    <g opacity={opacity}>
      <StockRect
        data-item-id={item.id}
        data-state={state}
        data-service-slot={serviceSlot}
        x={x}
        y={y}
        width={220}
        height={44}
        rx={scales.corner(5)}
        fill={tokens.color.elevated}
        stroke={state === "completed" ? accent : tokens.color.line}
      />
      <circle cx={x + 10} cy={y + 10} r={3} fill={accent} />
      {input.showItemLabels ? (
        <FitText
          text={item.label}
          x={x + 20}
          y={y + 18}
          width={192}
          fontSize={14}
          maxLines={2}
          breakLongWords
          normalizeWhitespace
        />
      ) : undefined}
    </g>
  );
}
