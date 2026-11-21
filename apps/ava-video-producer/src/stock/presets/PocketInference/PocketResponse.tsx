import { SketchedShape } from "../../primitives/SketchedShape";
import { StockRect } from "../../primitives/StockRect";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { ResponseWriting } from "./ResponseWriting/ResponseWriting";
import type { Input } from "./PocketInference.schema";
import type { ReactNode } from "react";

type Props = { frame: number; input: Input; accent: string };
/**
 * A moving opaque fold reveals the response after the internal cartridge
 * ripple.
 */
export function PocketResponse({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const progress = motion.ramp(frame, 80, motion.scale(28));
  return (
    <g>
      <StockRect
        data-internal-response="local"
        data-response-progress={progress}
        x={202}
        y={336}
        width={556}
        height={142}
        rx={scales.corner(3)}
        fill={tokens.color.surface}
        stroke={accent}
        strokeOpacity={progress}
      />
      <ResponseWriting {...{ input, accent }} />
      {progress < 1 ? (
        <rect
          data-response-fold="unfurling"
          x={203}
          y={336 + 142 * progress}
          width={554}
          height={142 * (1 - progress)}
          fill={tokens.color.surface}
        />
      ) : undefined}
      <SketchedShape
        shape={{ kind: "path", d: `M202 336 h556 v${142 * progress}` }}
        profile={tokens.sketch.shape}
        fill="none"
        stroke={accent}
        strokeWidth={scales.stroke(tokens.stroke.default)}
      />
    </g>
  );
}
