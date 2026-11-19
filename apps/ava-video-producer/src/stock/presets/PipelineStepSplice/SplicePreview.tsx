import { mix, ramp } from "../../../motion";
import { SketchedShape } from "../../primitives/SketchedShape";
import { StockRect } from "../../primitives/StockRect/StockRect";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { PreviewValue } from "./PreviewValue";
import type { Input } from "./PipelineStepSplice.schema";
import type { ReactNode } from "react";

type Props = { preview: Input["preview"]; frame: number; accent: string };

/** Frames the preview takes to unfold. */
const UNFOLD_FRAMES = 34;
/** The preview panel's corner before the corner style scales it. */
const PANEL_CORNER = 5;
/** The supplied example is displayed literally. No operation executes here. */
export function SplicePreview({
  preview,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
  const motion = useGraphicMotion();
  const unfolding = ramp(
    frame,
    98,
    motion.scale(UNFOLD_FRAMES),
    motion.entrance.easing,
  );
  return (
    <g data-preview="authored" opacity={unfolding}>
      <StockRect
        x={64}
        y={416}
        width={832}
        height={mix(unfolding, 12, 154)}
        rx={scales.corner(PANEL_CORNER)}
        fill={tokens.color.surface}
        stroke={tokens.color.line}
      />
      <PreviewValue
        label={preview.inputLabel}
        value={preview.inputValue}
        isOutput={false}
        accent={accent}
      />
      <SketchedShape
        shape={{ kind: "path", d: "M88 488H872" }}
        profile={tokens.sketch.shape}
        stroke={tokens.color.line}
      />
      <PreviewValue
        label={preview.outputLabel}
        value={preview.outputValue}
        isOutput
        accent={accent}
      />
    </g>
  );
}
