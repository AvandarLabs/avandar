import { ramp } from "../../../motion";
import { SketchedShape } from "../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { SEPARATE_CUE, SEPARATE_FRAMES } from "./getSeparationFromFrame";
import { getSpliceGeometryFromInputAndFrame } from "./getSpliceGeometryFromInputAndFrame";
import { SpliceJoint } from "./SpliceJoint";
import { SpliceModule } from "./SpliceModule/SpliceModule";
import type { Input } from "./PipelineStepSplice.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };
/** Frames the new joints take to close around the inserted step. */
const CLOSE_FRAMES = 16;
/** Open the old joints and close connectors along the new authored sequence. */
export function PipelineStrip({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const steps = getSpliceGeometryFromInputAndFrame({ input, frame, motion });
  // The original joints fade out while the steps separate.
  const fade = ramp(
    frame,
    SEPARATE_CUE,
    motion.scale(SEPARATE_FRAMES),
    motion.exit.easing,
  );
  const originalSteps = steps.filter((step) => {
    return !step.isInserted;
  });
  const closing = ramp(
    frame,
    82,
    motion.scale(CLOSE_FRAMES),
    motion.reveal.easing,
  );
  return (
    <g>
      {originalSteps.slice(1).map((step, index) => {
        return (
          <g key={step.id} data-original-join={step.id}>
            <SketchedShape
              shape={{
                kind: "line",
                x1: originalSteps[index].x + 140,
                y1: 345,
                x2: step.x,
                y2: 345,
              }}
              profile={tokens.sketch.shape}
              stroke={tokens.color.inactive}
              strokeWidth={scales.stroke(tokens.stroke.default)}
              opacity={1 - fade}
            />
          </g>
        );
      })}
      {steps.slice(1).map((step, index) => {
        return (
          <SpliceJoint
            key={step.id}
            from={steps[index]}
            to={step}
            index={index}
            closing={closing}
            joinStyle={input.joinStyle}
            accent={accent}
          />
        );
      })}
      {steps.map((step, index) => {
        return (
          <SpliceModule
            key={step.id}
            step={step}
            index={index}
            frame={frame}
            accent={accent}
          />
        );
      })}
    </g>
  );
}
