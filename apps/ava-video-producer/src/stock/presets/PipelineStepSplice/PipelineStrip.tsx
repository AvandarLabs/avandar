import { ramp } from "../../../motion";
import { STOCK } from "../../stockPalette";
import { getSpliceGeometryFromInputAndFrame } from "./getSpliceGeometryFromInputAndFrame";
import { SpliceJoint } from "./SpliceJoint";
import { SpliceModule } from "./SpliceModule";
import type { Input } from "./PipelineStepSplice.schema";
import type { ReactNode } from "react";
type Props = { input: Input; frame: number; accent: string };
/** Open the old joints and close connectors along the new authored sequence. */
export function PipelineStrip({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const steps = getSpliceGeometryFromInputAndFrame({ input, frame });
  const originalSteps = steps.filter((step) => !step.isInserted);
  const closing = ramp(frame, 82, 16);
  return (
    <g>
      {originalSteps.slice(1).map((step, index) => (
        <line
          key={step.id}
          data-original-join={step.id}
          x1={originalSteps[index].x + 140}
          y1={345}
          x2={step.x}
          y2={345}
          stroke={STOCK.muted}
          strokeWidth={2}
          opacity={1 - ramp(frame, 38, 30)}
        />
      ))}
      {steps.slice(1).map((step, index) => (
        <SpliceJoint
          key={step.id}
          from={steps[index]}
          to={step}
          index={index}
          closing={closing}
          joinStyle={input.joinStyle}
          accent={accent}
        />
      ))}
      {steps.map((step, index) => (
        <SpliceModule
          key={step.id}
          step={step}
          index={index}
          frame={frame}
          accent={accent}
        />
      ))}
    </g>
  );
}
