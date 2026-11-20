import { mix } from "../../../motion";
import { FitText } from "../../primitives/FitText/FitText";
import { PersonGlyph } from "../../primitives/PersonGlyph/PersonGlyph";
import { SketchedShape } from "../../primitives/SketchedShape";
import { StockRect } from "../../primitives/StockRect/StockRect";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "./HabitatCorridorReconnection.schema";
import type { ReactNode } from "react";
/** Inputs for CorridorDecision. */
type Props = { frame: number; input: Input };
/**
 * A management cue opens the authored footprint without changing its supplied
 * stage.
 */
export function CorridorDecision({ frame, input }: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const reach = motion.ramp(frame, 28, motion.whip, motion.travel.easing),
    handX = mix(reach, 449, 480);
  return (
    <g>
      <FitText
        text={input.decision.actorLabel}
        x={32}
        y={90}
        width={360}
        fontSize={12}
        maxLines={3}
        breakLongWords
        normalizeWhitespace
      />
      <FitText
        text={input.decision.actionLabel}
        x={550}
        y={90}
        width={378}
        fontSize={12}
        maxLines={3}
        breakLongWords
        normalizeWhitespace
      />
      <PersonGlyph
        x={439}
        y={101}
        size={32}
        role="worker"
        color={tokens.color.highlight}
      />
      <StockRect
        data-plan-control="true"
        x={472}
        y={95}
        width={16}
        height={16}
        fill={tokens.color.surface}
        stroke={tokens.color.highlight}
      />
      <SketchedShape
        shape={{ kind: "path", d: `M 445 101 L ${handX} 103` }}
        profile={tokens.sketch.shape}
        stroke={tokens.color.highlight}
        strokeWidth={scales.stroke(2.5)}
        fill="none"
      />
      <circle
        data-plan-hand="true"
        cx={handX}
        cy={103}
        r={3}
        fill={tokens.color.highlight}
      />
    </g>
  );
}
