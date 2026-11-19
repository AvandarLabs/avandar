import { ramp } from "../../../motion";
import { Arrive } from "../../graphics-common/Arrive";
import { DrawPath } from "../../graphics-common/DrawPath";
import { Text } from "../../graphics-common/Text";
import {
  useGraphicMotion,
  useGraphicProps,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { FieldRow } from "./FieldRow";
import { MatchRing } from "./MatchRing";
import {
  FIRST_ROW_Y,
  LINK_CUE,
  LINK_STEP,
  PANEL_WIDTH,
  ROW_INSET,
  ROW_STEP,
  ROW_WIDTH,
  SOURCE_ROW_CUE,
  TARGET_ROW_CUE,
  TYPE_BASELINE,
  TYPE_INSET,
} from "./SchemaMapping.constants";
import type { ReactNode } from "react";

type Props = {
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

/**
 * One mapping: the source field, the connecting edge, the match ring, and the
 * target field.
 */
export function MappingRow({
  index,
  frame,
  accent,
  left,
  right,
  ...row
}: Props): ReactNode {
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
