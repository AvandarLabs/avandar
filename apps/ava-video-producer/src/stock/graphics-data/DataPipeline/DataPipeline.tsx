import { ramp } from "../../../motion";
import { getStockDisplayCopyFromDescriptor } from "../../copy/getStockDisplayCopyFromDescriptor/getStockDisplayCopyFromDescriptor";
import { Eyebrow } from "../../graphics-common/Eyebrow";
import { GRAPHIC_WIDTH } from "../../graphics-common/graphicCanvas.constants";
import { Packet } from "../../graphics-common/Packet";
import { Text } from "../../graphics-common/Text";
import { LEGACY_DISPLAY_COPY } from "../../presets/legacy/legacyDisplayCopy";
import { StockRect } from "../../primitives/StockRect/StockRect";
import {
  useGraphicMotion,
  useGraphicProps,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { PipelineStage } from "./PipelineStage/PipelineStage";
import { STAGE_WIDTH } from "./PipelineStage/PipelineStage.constants";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { DataPipelineInput } from "../../presets/DataPipeline/DataPipeline.schema";
import type { ReactNode } from "react";

type Props = GraphicProps & { input: DataPipelineInput };

const STAGE_SPACING = 220;
const CONNECTOR_Y = 303;
const PACKET_PHASE_STEP = 17;
const PROGRESS_CUE = 30;
const PROGRESS_FRAMES = 92;
const HEADING_Y = 115;
const TRACK_Y = 464;
const FOOTER_Y = 506;

/** Draws the bounded authored data-pipeline study at an explicit frame. */
export function DataPipeline({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const style = useGraphicProps("DataPipeline", {});
  const tokens = useGraphicTokens();
  const motion = useGraphicMotion();
  const margin = tokens.layout.graphic.margin;
  const trackWidth = GRAPHIC_WIDTH - margin * 2;
  const stages = input.stages.map((stage, index) => ({
    ...stage,
    x: margin + index * STAGE_SPACING,
  }));
  const progress =
    ramp(
      frame,
      PROGRESS_CUE,
      motion.scale(PROGRESS_FRAMES),
      motion.travel.easing,
    ) * stages.length;
  return (
    <g>
      <Eyebrow>
        {getStockDisplayCopyFromDescriptor({
          descriptor: LEGACY_DISPLAY_COPY["data-pipeline"].dataPipeline,
        })}
      </Eyebrow>
      <Text role="display" x={margin} y={HEADING_Y}>
        {input.heading}
      </Text>
      {stages.slice(0, -1).map((stage, i) => (
        <g key={stage.label}>
          <path
            d={`M${stage.x + STAGE_WIDTH} ${CONNECTOR_Y} H${stage.x + STAGE_SPACING}`}
            stroke={tokens.color.line}
            strokeWidth={tokens.stroke.default}
          />
          <Packet
            frame={frame}
            from={{ x: stage.x + STAGE_WIDTH, y: CONNECTOR_Y }}
            to={{ x: stage.x + STAGE_SPACING, y: CONNECTOR_Y }}
            period={style.packetPeriod}
            delay={i * PACKET_PHASE_STEP}
            color={accent}
          />
        </g>
      ))}
      {stages.map((stage, i) => (
        <PipelineStage
          key={stage.label}
          stage={stage}
          index={i}
          frame={frame}
          accent={accent}
          active={Math.min(1, Math.max(0, progress - i))}
        />
      ))}
      {input.showProgress ? (
        <>
          <StockRect
            x={margin}
            y={TRACK_Y}
            width={trackWidth}
            height={style.trackHeight}
            rx={style.trackHeight / 2}
            fill={tokens.color.line}
          />
          <StockRect
            x={margin}
            y={TRACK_Y}
            width={trackWidth * Math.min(1, progress / stages.length)}
            height={style.trackHeight}
            rx={style.trackHeight / 2}
            fill={accent}
          />
        </>
      ) : null}
      <Text role="meta" x={margin} y={FOOTER_Y}>
        {getStockDisplayCopyFromDescriptor({
          descriptor: LEGACY_DISPLAY_COPY["data-pipeline"].input,
        })}
      </Text>
      <Text
        role="meta"
        x={margin + trackWidth}
        y={FOOTER_Y}
        fill={accent}
        anchor="end"
      >
        {getStockDisplayCopyFromDescriptor({
          descriptor: LEGACY_DISPLAY_COPY["data-pipeline"].output,
        })}
      </Text>
    </g>
  );
}
