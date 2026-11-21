import { Motion } from "../../../../motion";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { PreviewValue } from "../PreviewValue";
import { UnfoldingPreviewPanel } from "./UnfoldingPreviewPanel";
import type { Input } from "../PipelineStepSplice.schema";
import type { ReactNode } from "react";

type Props = {
  preview: Input["preview"];
  frame: number;
  accent: string;
};

/** Frames the preview takes to unfold. */
const UNFOLD_FRAMES = 34;

/** The supplied example is displayed literally. No operation executes here. */
export function SplicePreview({
  preview,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const unfolding = Motion.ramp({
    frame,
    at: 98,
    dur: motion.scale(UNFOLD_FRAMES),
    easing: motion.entrance.easing,
  });
  return (
    <g data-preview="authored" opacity={unfolding}>
      <UnfoldingPreviewPanel
        preview={preview}
        accent={accent}
        tokens={tokens}
        scales={scales}
        unfolding={unfolding}
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
