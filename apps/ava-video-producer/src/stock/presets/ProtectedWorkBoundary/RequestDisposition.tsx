import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { SketchedShape } from "../../primitives/SketchedShape";
import { StockRect } from "../../primitives/StockRect/StockRect";
import { useGraphicMotion, useGraphicShapeScales, useGraphicTheme, useGraphicTokens } from "../../theme/useGraphicTheme/useGraphicTheme";
import { getRequestPositionFromInputAndFrame } from "./getRequestPositionFromInputAndFrame";
import type { Input } from "./ProtectedWorkBoundary.schema";
import type { ReactNode } from "react";

type Props = { frame: number; input: Input; accent: string };
/**
 * Disposition copy is visibly attached to its actual tray or work-slot target.
 */
export function RequestDisposition({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  const { atomic } = useGraphicTheme();
  const tokens = useGraphicTokens();
  const motion = useGraphicMotion();
  const scales = useGraphicShapeScales();
  const position = getRequestPositionFromInputAndFrame({
    motion,
    frame,
    input,
  });
  return (
    <g opacity={motion.ramp(frame, 77, motion.scale(20))}>
      <g data-disposition-caption={input.request.placement}>
        <LabelSlots
          labels={[
            [
              input.request.placement === "defer"
                ? input.labels.deferred
                : input.labels.rescheduled,
              input.request.placement === "defer" ? 650 : 50,
              input.request.placement === "defer" ? 40 : 533,
              input.request.placement === "defer" ? 260 : 860,
              12,
              3,
            ],
          ]}
        />
      </g>
      {input.request.placement === "reschedule" ? (
        <SketchedShape
          shape={{
            kind: "path",
            d: `M${position.x + position.width / 2} ${position.y + position.height} V518 H50 V522`,
          }}
          profile={tokens.sketch.shape}
          data-disposition-link={input.request.agreedSlotId ?? undefined}
          fill="none"
          stroke={accent}
        />
      ) : undefined}
      {input.request.placement === "defer" ? (
        <StockRect
          x={650}
          y={75}
          width={260}
          height={125}
          rx={scales.corner(tokens.corner.cell)}
          fill="none"
          stroke={tokens.color.highlight}
          strokeDasharray={atomic.dash.bold.join(" ")}
        />
      ) : undefined}
    </g>
  );
}
