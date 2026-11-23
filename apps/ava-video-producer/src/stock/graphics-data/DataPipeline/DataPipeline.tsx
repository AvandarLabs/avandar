import { Motion } from "../../../motion";
import { GRAPHIC_WIDTH } from "../../graphics-common/graphicCanvas.constants";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import {
  STAGE_SPACING,
  PROGRESS_CUE,
  PROGRESS_FRAMES,
} from "./DataPipeline.constants";
import { PipelineEndpoints } from "./PipelineEndpoints";
import { PipelineHeading } from "./PipelineHeading";
import { PipelineProgress } from "./PipelineProgress";
import { PipelineStages } from "./PipelineStages";
import type { Props } from "./DataPipeline.types";
import type { ReactNode } from "react";

/** Renders the authored pipeline study for StockGraphic at a given frame. */
export function DataPipeline(props: Readonly<Props>): ReactNode {
  const style = GraphicThemeHooks.useGraphicProps({
    name: "DataPipeline",
    props: {},
  });
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const shapes = GraphicThemeHooks.useGraphicShapeScales();
  const margin = tokens.layout.graphic.margin;
  const stages = props.input.stages.map((stage, index) => {
    return {
      ...stage,
      x: margin + index * STAGE_SPACING,
    };
  });
  const progress =
    Motion.ramp({
      frame: props.frame,
      at: PROGRESS_CUE,
      dur: motion.scale(PROGRESS_FRAMES),
      easing: motion.travel.easing,
    }) * stages.length;
  const drawing = {
    ...props,
    style,
    tokens,
    shapes,
    margin,
    trackWidth: GRAPHIC_WIDTH - margin * 2,
    stages,
    progress,
  };
  return (
    <g>
      <PipelineHeading {...drawing} />
      <PipelineStages {...drawing} />
      <PipelineProgress {...drawing} />
      <PipelineEndpoints {...drawing} />
    </g>
  );
}
