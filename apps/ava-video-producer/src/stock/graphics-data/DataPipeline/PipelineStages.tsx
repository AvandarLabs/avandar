import { PipelineConnector } from "./PipelineConnector";
import { PipelineStage } from "./PipelineStage/PipelineStage";
import type { Drawing } from "./DataPipeline.types";
import type { ReactNode } from "react";

type Props = Drawing;

/** Renders the pipeline stages layer for DataPipeline. */
export function PipelineStages(props: Readonly<Props>): ReactNode {
  return (
    <>
      {props.stages.slice(0, -1).map((stage, stageIndex) => {
        return (
          <PipelineConnector
            key={stage.label}
            {...{ ...props, stage, stageIndex }}
          />
        );
      })}
      {props.stages.map((stage, stageIndex) => {
        return (
          <PipelineStage
            key={stage.label}
            stage={stage}
            index={stageIndex}
            frame={props.frame}
            accent={props.accent}
            active={Math.min(1, Math.max(0, props.progress - stageIndex))}
          />
        );
      })}
    </>
  );
}
