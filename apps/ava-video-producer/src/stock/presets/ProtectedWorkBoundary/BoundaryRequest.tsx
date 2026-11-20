import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { StockRect } from "../../primitives/StockRect/StockRect";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { getRequestPositionFromInputAndFrame } from "./getRequestPositionFromInputAndFrame";
import { RequestDisposition } from "./RequestDisposition";
import type { Input } from "./ProtectedWorkBoundary.schema";
import type { ReactNode } from "react";

type Props = { frame: number; input: Input; accent: string };
/** Outstanding request remains explicit in the tray or selected empty slot. */
export function BoundaryRequest({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const position = getRequestPositionFromInputAndFrame({
    motion,
    frame,
    input,
  });
  return (
    <g>
      <RequestDisposition frame={frame} input={input} accent={accent} />
      <g
        data-request={input.request.placement}
        data-request-outstanding="true"
        opacity={motion.ramp(frame, 39, motion.scale(7))}
      >
        <StockRect
          data-request-body="true"
          x={position.x}
          y={position.y}
          width={position.width}
          height={position.height}
          rx={scales.corner(6)}
          fill={tokens.color.elevated}
          stroke={accent}
        />
        <circle
          data-worker-hand="true"
          cx={position.x}
          cy={position.y + 12}
          r={5}
          fill={accent}
        />
        <LabelSlots
          labels={[
            [
              input.request.label,
              position.x + 7,
              position.y + 20,
              position.width - 14,
              12,
              5,
            ],
          ]}
        />
      </g>
    </g>
  );
}
