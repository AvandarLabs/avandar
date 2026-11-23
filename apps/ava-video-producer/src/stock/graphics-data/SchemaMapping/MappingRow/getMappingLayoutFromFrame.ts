import { Motion } from "../../../../motion";
import {
  FIRST_ROW_Y,
  LINK_CUE,
  LINK_STEP,
  PANEL_WIDTH,
  ROW_STEP,
} from "../SchemaMapping.constants";
import type {
  GetMappingRowYStateOptions,
  GetMappingRowYStateResult,
} from "./MappingRow.types";

/** Supplies MappingRow with frame-specific rendering geometry or progress. */
export function getMappingLayoutFromFrame({
  index,
  frame,
  accent,
  left,
  tokens,
  motion,
}: Readonly<GetMappingRowYStateOptions>): GetMappingRowYStateResult {
  const y = FIRST_ROW_Y + index * ROW_STEP;
  const color = index % 2 ? tokens.color.accentAlt : accent;
  const sourceX = left + PANEL_WIDTH;
  const cue = LINK_CUE + index * LINK_STEP;
  const t = Motion.ramp({
    frame,
    at: cue,
    dur: motion.hero,
    easing: motion.entrance.easing,
  });
  const field = { y, color };
  return { y, color, sourceX, cue, t, field };
}
