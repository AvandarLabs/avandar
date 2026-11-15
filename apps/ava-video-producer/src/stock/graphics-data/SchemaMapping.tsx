import { prop } from "@avandar/utils";
import { ramp } from "../../motion";
import {
  Arrive,
  Check,
  DrawPath,
  Eyebrow,
  GRAPHIC_WIDTH,
  Panel,
  Text,
  type GraphicProps,
} from "../graphics-common";
import { getStockDisplayCopyFromDescriptor } from "../copy/getStockDisplayCopyFromDescriptor/getStockDisplayCopyFromDescriptor";
import { LEGACY_DISPLAY_COPY } from "../presets/legacy/legacyDisplayCopy";
import { StockRect } from "../primitives/StockRect/StockRect";
import {
  useGraphicMotion,
  useGraphicProps,
  useGraphicTokens,
} from "../theme/useGraphicTheme";
import type { SchemaMappingInput } from "../presets/SchemaMapping/SchemaMapping.schema";

type Props = GraphicProps & { input: SchemaMappingInput };

const PANEL_TOP = 133;
const PANEL_WIDTH = 298;
const PANEL_HEIGHT = 373;
const TITLE_INSET = 26;
const TITLE_Y = 177;
const DIVIDER_Y = 202;
const FIRST_ROW_Y = 242;
const ROW_STEP = 68;
const ROW_INSET = 18;
const ROW_WIDTH = 262;
const ROW_HEIGHT = 46;
const ROW_HALF_HEIGHT = 22;
const FIELD_INSET = 14;
const FIELD_BASELINE = 6;
const TYPE_INSET = 16;
const TYPE_BASELINE = 5;
const SOURCE_ROW_CUE = 18;
const TARGET_ROW_CUE = 22;
const LINK_CUE = 26;
const LINK_STEP = 13;
const CAPTION_Y = 553;

function SchemaPanel({
  x,
  title,
  frame,
  index,
}: {
  x: number;
  title: string;
  frame: number;
  index: number;
}) {
  const style = useGraphicProps("SchemaMapping", {});
  const { color } = useGraphicTokens();
  return (
    <Arrive frame={frame} index={index}>
      <Panel x={x} y={PANEL_TOP} width={PANEL_WIDTH} height={PANEL_HEIGHT}>
        <Text role="panelTitle" x={x + TITLE_INSET} y={TITLE_Y}>
          {title}
        </Text>
        <line
          x1={x}
          y1={DIVIDER_Y}
          x2={x + PANEL_WIDTH}
          y2={DIVIDER_Y}
          stroke={color.line}
          strokeWidth={style.dividerWidth}
        />
      </Panel>
    </Arrive>
  );
}

type FieldProps = {
  x: number;
  y: number;
  portX: number;
  color: string;
  label: string;
  isPortFirst: boolean;
};

/**
 * A field row's card, port dot, and name. A target row draws its port before
 * its name and a source row after it, so each keeps its legacy paint order.
 */
function FieldRow({ x, y, portX, color, label, isPortFirst }: FieldProps) {
  const style = useGraphicProps("SchemaMapping", {});
  const tokens = useGraphicTokens();
  const port = <circle cx={portX} cy={y} r={style.dotRadius} fill={color} />;
  return (
    <>
      <StockRect
        x={x + ROW_INSET}
        y={y - ROW_HALF_HEIGHT}
        width={ROW_WIDTH}
        height={ROW_HEIGHT}
        rx={style.fieldRadius}
        fill={tokens.color.elevated}
      />
      {isPortFirst ? port : null}
      <Text role="field" x={x + ROW_INSET + FIELD_INSET} y={y + FIELD_BASELINE}>
        {label}
      </Text>
      {isPortFirst ? null : port}
    </>
  );
}

function MatchRing({
  y,
  color,
  opacity,
  showCheck,
}: {
  y: number;
  color: string;
  opacity: number;
  showCheck: boolean;
}) {
  const style = useGraphicProps("SchemaMapping", {});
  const tokens = useGraphicTokens();
  const x = GRAPHIC_WIDTH / 2;
  return (
    <g opacity={opacity}>
      <circle
        cx={x}
        cy={y}
        r={style.ringRadius}
        fill={tokens.color.ground}
        stroke={color}
        strokeOpacity={style.ringAlpha}
        strokeWidth={style.ringStrokeWidth}
      />
      {showCheck ? (
        <Check x={x} y={y} color={color} size={style.checkSize} />
      ) : null}
    </g>
  );
}

type RowProps = {
  label: string;
  target: string;
  type: string;
  index: number;
  frame: number;
  accent: string;
  left: number;
  right: number;
  showChecks: boolean;
};

function MappingRow({ index, frame, accent, left, right, ...row }: RowProps) {
  const style = useGraphicProps("SchemaMapping", {});
  const tokens = useGraphicTokens();
  const motion = useGraphicMotion();
  const y = FIRST_ROW_Y + index * ROW_STEP;
  const color = index % 2 ? tokens.color.accentAlt : accent;
  const sourceX = left + PANEL_WIDTH;
  const cue = LINK_CUE + index * LINK_STEP;
  const t = ramp(frame, cue, motion.hero, motion.entrance.easing);
  const field = { y, color };
  return (
    <g>
      <Arrive frame={frame} at={SOURCE_ROW_CUE} index={index}>
        <FieldRow
          {...field}
          x={left}
          portX={sourceX}
          label={row.label}
          isPortFirst={false}
        />
      </Arrive>
      <DrawPath
        curve={{ from: { x: sourceX, y }, to: { x: right, y } }}
        frame={frame}
        at={cue}
        color={color}
        opacity={style.edgeAlpha}
      />
      <MatchRing y={y} color={color} opacity={t} showCheck={row.showChecks} />
      <Arrive frame={frame} at={TARGET_ROW_CUE} index={index}>
        <FieldRow
          {...field}
          x={right}
          portX={right}
          label={row.target}
          isPortFirst
        />
        <Text
          role="detail"
          x={right + ROW_INSET + ROW_WIDTH - TYPE_INSET}
          y={y + TYPE_BASELINE}
          anchor="end"
        >
          {row.type}
        </Text>
      </Arrive>
    </g>
  );
}

/** Draws the bounded authored schema-mapping study at an explicit frame. */
export function SchemaMapping({ input, frame, accent }: Readonly<Props>) {
  const { layout } = useGraphicTokens();
  const left = layout.graphic.margin;
  const right = GRAPHIC_WIDTH - layout.graphic.margin - PANEL_WIDTH;
  const copy = LEGACY_DISPLAY_COPY["schema-mapping"];
  return (
    <g>
      <Eyebrow>
        {getStockDisplayCopyFromDescriptor({ descriptor: copy.schemaMapping })}
      </Eyebrow>
      <SchemaPanel x={left} title={input.sourceLabel} frame={frame} index={0} />
      <SchemaPanel
        x={right}
        title={input.targetLabel}
        frame={frame}
        index={1}
      />
      {input.mappings.map((mapping, i) => (
        <MappingRow
          key={mapping.source}
          label={mapping.source}
          target={mapping.target}
          type={mapping.type}
          index={i}
          frame={frame}
          accent={accent}
          left={left}
          right={right}
          showChecks={input.showChecks}
        />
      ))}
      <Text role="note" x={GRAPHIC_WIDTH / 2} y={CAPTION_Y} anchor="middle">
        {getStockDisplayCopyFromDescriptor({
          descriptor: copy.differentNamesExplicitConnections,
        })}
      </Text>
    </g>
  );
}
