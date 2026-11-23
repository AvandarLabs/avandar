import { Panel } from "../../../graphics-common/Panel";
import { Text } from "../../../graphics-common/Text";
import { StockRect } from "../../../primitives/StockRect";
import {
  STAGE_HEIGHT,
  STAGE_TOP,
  STAGE_WIDTH,
} from "./PipelineStage.constants";
import { StageIcon } from "./StageIcon";
import { StageLabel } from "./StageLabel";
import type { StagePanelData } from "./PipelineStage.types";
import type { ReactNode } from "react";

type Props = StagePanelData;

/** Renders the stage panel layer for PipelineStage. */
export function StagePanel(options: Readonly<Props>): ReactNode {
  return (
    <Panel
      x={options.stage.x}
      y={STAGE_TOP}
      width={STAGE_WIDTH}
      height={STAGE_HEIGHT}
    >
      <StockRect
        x={options.stage.x}
        y={STAGE_TOP}
        width={STAGE_WIDTH}
        height={STAGE_HEIGHT}
        rx={options.shapes.corner(options.panel.radius)}
        fill={options.accent}
        fillOpacity={
          options.active * options.shapes.wash(options.style.activeTintAlpha)
        }
        stroke={options.accent}
        strokeOpacity={options.active * options.style.activeStrokeAlpha}
        strokeWidth={options.shapes.stroke(options.style.activeStrokeWidth)}
      />
      <Text role="pill" x={options.stage.x + 22} y={239}>
        0{options.index + 1}
      </Text>
      <StageIcon
        x={options.iconX}
        accent={options.accent}
        active={options.active}
      />
      <StageLabel
        x={options.iconX}
        label={options.stage.label}
        detail={options.stage.detail}
      />
    </Panel>
  );
}
