import { LabelSlots } from "../../../primitives/LabelSlots/LabelSlots";
import { SketchedShape } from "../../../primitives/SketchedShape";
import { StockRect } from "../../../primitives/StockRect/StockRect";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { GapPointer } from "./GapPointer";
import { type Props } from "./PaymentTrayShared.types";
import type { ReactNode } from "react";
/**
 * The participant points to a stated position that originally lacked a token.
 */
export function PaymentTray({
  payment,
  frame,
  index,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const y = 306 + index * 120;
  return (
    <g>
      <SketchedShape
        shape={{
          kind: "path",
          d: `M290 ${y + 81} h540 v23 H290 Z M290 ${y + 81} l270 16 l270 -16`,
        }}
        profile={tokens.sketch.shape}
        data-correction-envelope={payment.id}
        fill={tokens.color.surface}
        stroke={tokens.color.accentAlt}
      />
      <StockRect
        data-receiving-tray={payment.id}
        x={300}
        y={y - 5}
        width={568}
        height={66}
        rx={scales.corner(tokens.corner.cell)}
        fill="none"
        stroke={tokens.color.line}
      />
      <LabelSlots labels={[[payment.label, 48, y + 24, 220, 14, 3]]} />
      {frame >= 60 &&
      frame <= 70 &&
      payment.receivedUnits < payment.statedUnits ? (
        <GapPointer payment={payment} y={y} accent={accent} />
      ) : undefined}
    </g>
  );
}
