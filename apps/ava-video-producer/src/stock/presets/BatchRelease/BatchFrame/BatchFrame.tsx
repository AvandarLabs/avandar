import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { type Props } from "./BatchFrameShared/BatchFrameShared.types";
import { EnvelopeSeal } from "./EnvelopeSeal";
import type { ReactNode } from "react";
/** The faint wash inside an envelope before the tint strength scales it. */
const ENVELOPE_WASH = 0.035;
/** The handling boundary seals after the final member reaches its slot. */
export function BatchFrame({
  batchId,
  isComplete,
  x,
  y,
  width,
  frame,
  completeAt,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return (
    <g>
      <rect
        data-batch-envelope={batchId}
        data-complete={isComplete}
        x={x}
        y={y}
        width={width}
        height={130}
        rx={scales.corner(tokens.corner.card)}
        fill={accent}
        fillOpacity={scales.wash(ENVELOPE_WASH)}
        stroke="none"
      />
      <SketchedShape
        shape={{
          kind: "path",
          d: `M${x} ${y + 20} V${y + 130} H${x + width} V${y + 20}`,
        }}
        profile={tokens.sketch.shape}
        fill="none"
        stroke={accent}
        strokeWidth={scales.stroke(tokens.stroke.default)}
      />
      <EnvelopeSeal {...{ batchId, x, y, width, frame, completeAt, accent }} />
    </g>
  );
}
