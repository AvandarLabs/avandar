import { StockRect } from "../../primitives/StockRect";
import { TRACK_Y } from "./DataPipeline.constants";
import type { Drawing } from "./DataPipeline.types";
import type { ReactNode } from "react";

type Props = Drawing;

/** Renders the pipeline progress layer for DataPipeline. */
export function PipelineProgress(props: Readonly<Props>): ReactNode {
  return props.input.showProgress ? (
    <>
      <StockRect
        x={props.margin}
        y={TRACK_Y}
        width={props.trackWidth}
        height={props.style.trackHeight}
        rx={props.shapes.corner(props.style.trackHeight / 2)}
        fill={props.tokens.color.line}
      />
      <StockRect
        x={props.margin}
        y={TRACK_Y}
        width={
          props.trackWidth * Math.min(1, props.progress / props.stages.length)
        }
        height={props.style.trackHeight}
        rx={props.shapes.corner(props.style.trackHeight / 2)}
        fill={props.accent}
      />
    </>
  ) : null;
}
