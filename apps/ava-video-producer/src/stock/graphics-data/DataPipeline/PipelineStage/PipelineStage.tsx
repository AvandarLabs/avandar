import { Arrive } from "../../../graphics-common/Arrive/Arrive";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { ICON_OFFSET_X, STAGE_CUE } from "./PipelineStage.constants";
import { StagePanel } from "./StagePanel";
import type { Props } from "./PipelineStage.types";
import type { ReactNode } from "react";

/** Renders PipelineStage within the authored stock graphics. */
export function PipelineStage({
  stage,
  index,
  frame,
  accent,
  active,
}: Readonly<Props>): ReactNode {
  const style = GraphicThemeHooks.useGraphicProps({
    name: "DataPipeline",
    props: {},
  });
  const panel = GraphicThemeHooks.useGraphicProps({
    name: "Panel",
    props: {},
  });
  const shapes = GraphicThemeHooks.useGraphicShapeScales();
  const iconX = stage.x + ICON_OFFSET_X;
  return (
    <Arrive frame={frame} index={index} at={STAGE_CUE}>
      <StagePanel
        {...{
          stage,
          index,
          accent,
          active,
          style,
          panel,
          shapes,
          iconX,
        }}
      />
    </Arrive>
  );
}
