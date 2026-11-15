import { ramp } from "../../motion";
import { getStockDisplayCopyFromDescriptor } from "../copy/getStockDisplayCopyFromDescriptor/getStockDisplayCopyFromDescriptor";
import {
  Arrive,
  Check,
  Eyebrow,
  GRAPHIC_WIDTH,
  Packet,
  Panel,
  Text,
  type GraphicProps,
} from "../graphics-common";
import { LEGACY_DISPLAY_COPY } from "../presets/legacy/legacyDisplayCopy";
import { StockRect } from "../primitives/StockRect/StockRect";
import {
  useGraphicMotion,
  useGraphicProps,
  useGraphicTokens,
} from "../theme/useGraphicTheme";
import type { DataPipelineInput } from "../presets/DataPipeline/DataPipeline.schema";
import type { ReactNode } from "react";

type Props = GraphicProps & { input: DataPipelineInput };
type Stage = DataPipelineInput["stages"][number] & { x: number };

const STAGE_SPACING = 220;
const STAGE_WIDTH = 172;
const STAGE_HEIGHT = 205;
const STAGE_TOP = 206;
const STAGE_CUE = 16;
const ICON_OFFSET_X = 86;
const ICON_Y = 284;
const CONNECTOR_Y = 303;
const PACKET_PHASE_STEP = 17;
const PROGRESS_CUE = 30;
const PROGRESS_FRAMES = 92;
const HEADING_Y = 115;
const TRACK_Y = 464;
const FOOTER_Y = 506;

function PipelineStage({
  stage,
  index,
  frame,
  accent,
  active,
}: {
  stage: Stage;
  index: number;
  frame: number;
  accent: string;
  active: number;
}) {
  const style = useGraphicProps("DataPipeline", {});
  const panel = useGraphicProps("Panel", {});
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
          rx={panel.radius}
          fill={accent}
          fillOpacity={active * style.activeTintAlpha}
          stroke={accent}
          strokeOpacity={active * style.activeStrokeAlpha}
          strokeWidth={style.activeStrokeWidth}
        />
        <Text role="pill" x={stage.x + 22} y={239}>
          0{index + 1}
        </Text>
        <circle
          cx={iconX}
          cy={ICON_Y}
          r={style.iconRadius}
          fill={accent}
          fillOpacity={style.iconFillAlpha}
          stroke={accent}
          strokeOpacity={style.iconStrokeAlpha}
          strokeWidth={style.iconStrokeWidth}
        />
        <g opacity={active}>
          <Check x={iconX} y={ICON_Y} color={accent} size={style.checkSize} />
        </g>
        <g opacity={1 - active}>
          <circle cx={iconX} cy={ICON_Y} r={style.dotRadius} fill={accent} />
        </g>
        <Text role="cardTitle" x={iconX} y={341} anchor="middle">
          {stage.label}
        </Text>
        <Text role="note" x={iconX} y={371} anchor="middle">
          {stage.detail}
        </Text>
      </Panel>
    </Arrive>
  );
}

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
