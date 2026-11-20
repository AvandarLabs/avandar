import { mix } from "../../../motion";
import { FitText } from "../../primitives/FitText/FitText";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { SketchedShape } from "../../primitives/SketchedShape";
import { StockRect } from "../../primitives/StockRect/StockRect";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "./SchemaPlanLocalExecution.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };
/**
 * Only explicitly supplied question/schema copy leaves; the authored plan
 * returns.
 */
export function PlannerExchange({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const sending = motion.ramp(
    frame,
    13,
    motion.scale(30),
    motion.travel.easing,
  );
  const returning = motion.ramp(
    frame,
    56,
    motion.scale(44),
    motion.travel.easing,
  );
  const outboundX = mix(sending, 55, 630);
  const inboundX = mix(returning, 630, 60);
  return (
    <g>
      <SketchedShape
        shape={{ kind: "path", d: "M550 180 H620" }}
        profile={tokens.sketch.shape}
        data-outbound-route="true"
        stroke={tokens.color.highlight}
        strokeWidth={scales.stroke(tokens.stroke.default)}
      />
      <SketchedShape
        shape={{ kind: "path", d: "M620 154 H550" }}
        profile={tokens.sketch.shape}
        data-inbound-route="true"
        stroke={accent}
        strokeWidth={scales.stroke(tokens.stroke.default)}
      />
      <g
        data-outbound="true"
        transform={`translate(${outboundX} ${mix(motion.ramp(frame, 43, motion.scale(12), motion.travel.easing), 108, 340)})`}
      >
        <StockRect
          width={280}
          height={186}
          rx={scales.corner(tokens.corner.cell)}
          fill={tokens.color.elevated}
          stroke={tokens.color.highlight}
        />
        <FitText
          text={input.request.question}
          x={12}
          y={22}
          width={256}
          fontSize={14}
          maxLines={5}
          normalizeWhitespace
          breakLongWords
        />
        <LabelSlots
          labels={[
            [input.columns.category, 12, 120, 122, 14, 4],
            [input.columns.measure, 146, 120, 122, 14, 4],
          ]}
        />
      </g>
      <g
        data-inbound="true"
        opacity={frame >= 56 ? 1 : 0}
        transform={`translate(${inboundX} 108)`}
      >
        <StockRect
          width={280}
          height={90}
          rx={scales.corner(6)}
          fill={tokens.color.surface}
          stroke={accent}
        />
        <LabelSlots labels={[[input.request.planLabel, 12, 22, 256, 16, 4]]} />
      </g>
    </g>
  );
}
