import { SpliceJoint } from "../SpliceJoint";
import { SpliceModule } from "../SpliceModule/SpliceModule";
import { OriginalPipelineJoints } from "./OriginalPipelineJoints";
import { usePipelineStripPresentation } from "./usePipelineStripPresentation";
import type { Input } from "../PipelineStepSplice.schema.ts";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };
/** Open the old joints and close connectors along the new authored sequence. */
export function PipelineStrip(props: Readonly<Props>): ReactNode {
  const presentation = usePipelineStripPresentation(props);

  return (
    <g>
      <OriginalPipelineJoints {...presentation} />
      {presentation.steps.slice(1).map((step, index) => {
        return (
          <SpliceJoint
            key={step.id}
            from={presentation.steps[index]}
            to={step}
            index={index}
            closing={presentation.closing}
            joinStyle={props.input.joinStyle}
            accent={props.accent}
          />
        );
      })}
      {presentation.steps.map((step, index) => {
        return (
          <SpliceModule
            key={step.id}
            step={step}
            index={index}
            frame={props.frame}
            accent={props.accent}
          />
        );
      })}
    </g>
  );
}
