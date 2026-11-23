import { Packet } from "../../graphics-common/Packet/Packet";
import { SketchedShape } from "../../primitives/SketchedShape";
import {
  STAGE_SPACING,
  CONNECTOR_Y,
  PACKET_PHASE_STEP,
} from "./DataPipeline.constants";
import { STAGE_WIDTH } from "./PipelineStage/PipelineStage.constants";
import type { Drawing } from "./DataPipeline.types";
import type { ReactNode } from "react";

type Props = Drawing & { stage: Drawing["stages"][number]; stageIndex: number };

/** Renders the pipeline connector layer for DataPipeline. */
export function PipelineConnector(props: Readonly<Props>): ReactNode {
  return (
    <g key={props.stage.label}>
      <SketchedShape
        shape={{
          kind: "path",
          d: `M${props.stage.x + STAGE_WIDTH} ${CONNECTOR_Y} H${props.stage.x + STAGE_SPACING}`,
        }}
        profile={props.tokens.sketch.shape}
        stroke={props.tokens.color.line}
        strokeWidth={props.shapes.stroke(props.tokens.stroke.default)}
      />
      <Packet
        frame={props.frame}
        from={{ x: props.stage.x + STAGE_WIDTH, y: CONNECTOR_Y }}
        to={{ x: props.stage.x + STAGE_SPACING, y: CONNECTOR_Y }}
        period={props.style.packetPeriod}
        delay={props.stageIndex * PACKET_PHASE_STEP}
        color={props.accent}
      />
    </g>
  );
}
