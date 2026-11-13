import {
  Arrive,
  DrawPath,
  Eyebrow,
  GRAPHIC_WIDTH,
  Packet,
  Panel,
  Text,
  type GraphicProps,
} from "../graphics-common";
import { getStockDisplayCopyFromDescriptor } from "../i18n/getStockDisplayCopyFromDescriptor/getStockDisplayCopyFromDescriptor";
import { LEGACY_DISPLAY_COPY } from "../presets/legacy/legacyDisplayCopy";
import { StockRect } from "../primitives/StockRect/StockRect";
import { resolveContentColor } from "../theme/resolveContentColor/resolveContentColor";
import { useGraphicProps, useGraphicTokens } from "../theme/useGraphicTheme";
import type { SourceMergeInput } from "../presets/SourceMerge/SourceMerge.schema";
import type { ReactNode } from "react";

type Props = GraphicProps & { input: SourceMergeInput };
type Source = SourceMergeInput["sources"][number];
type SourceRowProps = {
  source: Source;
  index: number;
  frame: number;
  color: string;
  showPackets: boolean;
};

const SOURCE_TOP = 148;
const SOURCE_STEP = 132;
const SOURCE_WIDTH = 226;
const SOURCE_HEIGHT = 86;
/** Frame at which the first source edge starts drawing in. */
const SOURCE_EDGE_CUE = 24;
/** Frames between successive source edges starting to draw. */
const SOURCE_EDGE_STEP = 3;
/** Frames between successive source packets' loop phases. */
const SOURCE_PACKET_STEP = 22;
const MERGE = { x: 508, y: 323 };
/** Where every source edge meets the merge node. */
const MERGE_INPUT = { x: 491, y: MERGE.y };
const OUTPUT = { from: { x: 525, y: 323 }, to: { x: 662, y: 323 } };
const DESTINATION = { y: 233, width: 234, height: 180 };
const MERGE_GLYPH = "M493 314 L508 329 L523 314 M508 300 V329 M508 329 V344";

function SourceChip({
  source,
  x,
  y,
  color,
}: Readonly<{ source: Source; x: number; y: number; color: string }>) {
  const style = useGraphicProps("SourceMerge", {});
  return (
    <>
      <StockRect
        x={x + 17}
        y={y + 20}
        width={46}
        height={46}
        rx={style.chipRadius}
        fill={color}
        fillOpacity={style.chipFillAlpha}
        stroke={color}
        strokeOpacity={style.chipStrokeAlpha}
        strokeWidth={style.chipStrokeWidth}
      />
      <Text role="pill" x={x + 40} y={y + 49} fill={color} anchor="middle">
        {source.kind}
      </Text>
    </>
  );
}

function SourceRow({
  source,
  index,
  frame,
  color,
  showPackets,
}: Readonly<SourceRowProps>) {
  const style = useGraphicProps("SourceMerge", {});
  const { layout } = useGraphicTokens();
  const x = layout.graphic.margin;
  const y = SOURCE_TOP + index * SOURCE_STEP;
  const from = { x: x + SOURCE_WIDTH, y: y + 43 };
  return (
    <g>
      <DrawPath
        curve={{ from, to: MERGE_INPUT }}
        frame={frame}
        at={SOURCE_EDGE_CUE + index * SOURCE_EDGE_STEP}
        color={color}
        opacity={style.edgeAlpha}
      />
      {showPackets ? (
        <Packet
          frame={frame}
          from={from}
          to={MERGE_INPUT}
          color={color}
          delay={index * SOURCE_PACKET_STEP}
        />
      ) : null}
      <Arrive frame={frame} index={index}>
        <Panel x={x} y={y} width={SOURCE_WIDTH} height={SOURCE_HEIGHT}>
          <SourceChip source={source} x={x} y={y} color={color} />
          <Text role="itemLabel" x={x + 79} y={y + 49}>
            {source.name}
          </Text>
        </Panel>
      </Arrive>
    </g>
  );
}

function OutputEdge({
  frame,
  accent,
  showPackets,
}: Readonly<{ frame: number; accent: string; showPackets: boolean }>) {
  const style = useGraphicProps("SourceMerge", {});
  return (
    <>
      <DrawPath
        d="M525 323 H662"
        frame={frame}
        at={40}
        color={accent}
        opacity={style.outEdgeAlpha}
        width={style.outEdgeWidth}
      />
      {showPackets ? (
        <Packet
          frame={frame}
          from={OUTPUT.from}
          to={OUTPUT.to}
          color={accent}
          period={style.outPacketPeriod}
          delay={31}
        />
      ) : null}
    </>
  );
}

function MergeNode({
  frame,
  accent,
}: Readonly<{ frame: number; accent: string }>) {
  const style = useGraphicProps("SourceMerge", {});
  const { color } = useGraphicTokens();
  return (
    <Arrive frame={frame} at={24}>
      <circle
        cx={MERGE.x}
        cy={MERGE.y}
        r={style.mergeRadius}
        fill={color.surface}
        stroke={accent}
        strokeOpacity={style.mergeStrokeAlpha}
        strokeWidth={style.mergeStrokeWidth}
      />
      <path
        d={MERGE_GLYPH}
        fill="none"
        stroke={accent}
        strokeWidth={style.glyphWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Text role="note" x={MERGE.x} y={394} anchor="middle">
        {getStockDisplayCopyFromDescriptor({
          descriptor: LEGACY_DISPLAY_COPY["source-merge"].merge,
        })}
      </Text>
    </Arrive>
  );
}

function DestinationSlots({
  x,
  accent,
}: Readonly<{ x: number; accent: string }>) {
  const style = useGraphicProps("SourceMerge", {});
  return [0, 1, 2].map((slot) => (
    <g key={slot}>
      <StockRect
        x={x + 33 + slot * 59}
        y={361}
        width={45}
        height={26}
        rx={style.slotRadius}
        fill={accent}
        fillOpacity={style.slotFillAlpha}
      />
      <path
        d={`M${x + 44 + slot * 59} 374 h23`}
        stroke={accent}
        strokeOpacity={style.slotStrokeAlpha}
        strokeWidth={style.slotStrokeWidth}
      />
    </g>
  ));
}

function Destination({
  input,
  frame,
  accent,
}: Readonly<{ input: SourceMergeInput; frame: number; accent: string }>) {
  const style = useGraphicProps("SourceMerge", {});
  const { layout } = useGraphicTokens();
  const x = GRAPHIC_WIDTH - layout.graphic.margin - DESTINATION.width;
  const center = x + DESTINATION.width / 2;
  return (
    <Arrive frame={frame} at={34}>
      <Panel
        x={x}
        y={DESTINATION.y}
        width={DESTINATION.width}
        height={DESTINATION.height}
        stroke={accent}
      >
        <StockRect
          x={x + 20}
          y={252}
          width={194}
          height={style.barHeight}
          rx={style.barHeight / 2}
          fill={accent}
          fillOpacity={style.barAlpha}
        />
        <Text role="title" x={center} y={305} anchor="middle">
          {input.destination.label}
        </Text>
        <Text role="secondary" x={center} y={336} anchor="middle">
          {input.destination.detail}
        </Text>
        <DestinationSlots x={x} accent={accent} />
      </Panel>
    </Arrive>
  );
}

/** Draws the bounded authored source-merge study at an explicit frame. */
export function SourceMerge({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  return (
    <g>
      <Eyebrow>
        {getStockDisplayCopyFromDescriptor({
          descriptor: LEGACY_DISPLAY_COPY["source-merge"].unifyTheInputs,
        })}
      </Eyebrow>
      {input.sources.map((source, index) => (
        <SourceRow
          key={source.name}
          source={source}
          index={index}
          frame={frame}
          color={
            index === 1
              ? accent
              : resolveContentColor(source.color, { tokens, accent })
          }
          showPackets={input.showPackets}
        />
      ))}
      <OutputEdge
        frame={frame}
        accent={accent}
        showPackets={input.showPackets}
      />
      <MergeNode frame={frame} accent={accent} />
      <Destination input={input} frame={frame} accent={accent} />
      <Text
        role="pill"
        x={GRAPHIC_WIDTH - tokens.layout.graphic.margin}
        y={552}
        anchor="end"
      >
        {getStockDisplayCopyFromDescriptor({
          descriptor: LEGACY_DISPLAY_COPY["source-merge"].conceptualDataFlow,
        })}
      </Text>
    </g>
  );
}
