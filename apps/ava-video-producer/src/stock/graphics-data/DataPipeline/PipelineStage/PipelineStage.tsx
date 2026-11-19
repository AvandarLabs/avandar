import { Arrive } from "../../../graphics-common/Arrive";
import { Panel } from "../../../graphics-common/Panel";
import { Text } from "../../../graphics-common/Text";
import { StockRect } from "../../../primitives/StockRect/StockRect";
import {
  useGraphicProps,
  useGraphicShapeScales,
} from "../../../theme/useGraphicTheme/useGraphicTheme";
import {
  ICON_OFFSET_X,
  STAGE_CUE,
  STAGE_HEIGHT,
  STAGE_TOP,
  STAGE_WIDTH,
} from "./PipelineStage.constants";
import { StageIcon } from "./StageIcon";
import { StageLabel } from "./StageLabel";
import type { DataPipelineInput } from "../../../presets/DataPipeline/DataPipeline.schema";
import type { ReactNode } from "react";

type Stage = DataPipelineInput["stages"][number] & { x: number };

type Props = Readonly<{
  stage: Stage;
  index: number;
  frame: number;
  accent: string;
  active: number;
}>;

/** One stage panel: its active tint, number, icon, title, and note. */
export function PipelineStage({
  stage,
  index,
  frame,
  accent,
  active,
}: Props): ReactNode {
  const style = useGraphicProps("DataPipeline", {});
  const panel = useGraphicProps("Panel", {});
  const shapes = useGraphicShapeScales();
  const iconX = stage.x + ICON_OFFSET_X;
  return (
    <Arrive frame={frame} index={index} at={STAGE_CUE}>
      <Panel
        x={stage.x}
        y={STAGE_TOP}
        width={STAGE_WIDTH}
        height={STAGE_HEIGHT}
      >
        <StockRect
          x={stage.x}
          y={STAGE_TOP}
          width={STAGE_WIDTH}
          height={STAGE_HEIGHT}
          rx={shapes.corner(panel.radius)}
          fill={accent}
          fillOpacity={active * shapes.wash(style.activeTintAlpha)}
          stroke={accent}
          strokeOpacity={active * style.activeStrokeAlpha}
          strokeWidth={shapes.stroke(style.activeStrokeWidth)}
        />
        <Text role="pill" x={stage.x + 22} y={239}>
          0{index + 1}
        </Text>
        <StageIcon x={iconX} accent={accent} active={active} />
        <StageLabel x={iconX} label={stage.label} detail={stage.detail} />
      </Panel>
    </Arrive>
  );
}
