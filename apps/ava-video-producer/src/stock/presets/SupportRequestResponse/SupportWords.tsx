import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { SketchedShape } from "../../primitives/SketchedShape";
import { StockRect } from "../../primitives/StockRect/StockRect";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "./SupportRequestResponse.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number };
/** Exact authored words stay distinct from the structured response state. */
export function SupportWords({ input, frame }: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return (
    <g>
      <g
        data-request-copy="true"
        opacity={
          motion.reveal(frame, 12) *
          (input.showRequestAtHold
            ? 1
            : 1 - motion.ramp(frame, 130, motion.scale(1)))
        }
      >
        <StockRect
          x={60}
          y={55}
          width={390}
          height={126}
          rx={scales.corner(tokens.corner.panel)}
          fill={tokens.color.surface}
          stroke={tokens.color.line}
        />
        <SketchedShape
          shape={{ kind: "path", d: "M225 181 l15 18 l15 -18" }}
          profile={tokens.sketch.shape}
          fill={tokens.color.surface}
          stroke={tokens.color.line}
        />
        <LabelSlots labels={[[input.requestText, 80, 86, 350, 18, 4]]} />
      </g>
      <g
        data-response-copy="true"
        opacity={motion.ramp(frame, 43, motion.scale(20))}
      >
        <StockRect
          x={510}
          y={55}
          width={390}
          height={126}
          rx={scales.corner(tokens.corner.panel)}
          fill={tokens.color.surface}
          stroke={tokens.color.accentAlt}
        />
        <SketchedShape
          shape={{ kind: "path", d: "M640 181 l15 18 l15 -18" }}
          profile={tokens.sketch.shape}
          data-response-tail="true"
          fill={tokens.color.surface}
          stroke={tokens.color.accentAlt}
        />
        <LabelSlots labels={[[input.response.text, 530, 86, 350, 18, 4]]} />
      </g>
    </g>
  );
}
