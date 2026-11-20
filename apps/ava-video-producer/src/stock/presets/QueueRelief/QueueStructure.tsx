import { StockRect } from "../../primitives/StockRect/StockRect";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { QueueHeadings } from "./QueueHeadings";
import { QueueServiceBay } from "./QueueServiceBay";
import type { Input } from "./QueueRelief.schema";
import type { ReactNode } from "react";

type Props = { frame: number; input: Input; accent: string };
/** Closed bay outlines unfold before any waiting item can enter them. */
export function QueueStructure({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const expansion = motion.ramp(frame, 54, motion.scale(36));
  return (
    <g>
      <QueueHeadings frame={frame} input={input} />
      <StockRect
        x={36}
        y={154}
        width={248}
        height={414}
        rx={scales.corner(tokens.corner.cell)}
        fill="none"
        stroke={tokens.color.line}
      />
      <StockRect
        x={664}
        y={154}
        width={252}
        height={414}
        rx={scales.corner(tokens.corner.cell)}
        fill="none"
        stroke={accent}
      />
      {input.serviceSlots.map((slot, index) => {
        return (
          <QueueServiceBay
            key={slot.id}
            slot={slot}
            index={index}
            expansion={expansion}
            accent={accent}
          />
        );
      })}
    </g>
  );
}
