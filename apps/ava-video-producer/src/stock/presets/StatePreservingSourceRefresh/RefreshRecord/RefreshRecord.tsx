import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { RefreshRecordContent } from "./RefreshRecordContent";
import type { Input } from "../StatePreservingSourceRefresh.schema";
import type { ReactNode } from "react";

type Props = {
  input: Input;
  record: Input["records"][number];
  index: number;
  frame: number;
  accent: string;
};

type RefreshOptions = {
  record: Readonly<Props>["record"];
  frame: Readonly<Props>["frame"];
  motion: ReturnType<typeof GraphicThemeHooks.useGraphicMotion>;
  source: Readonly<Props>["input"]["sourceRows"][number] | undefined;
};

type GetRefreshRecordRefreshStateResult = {
  refresh: number;
  isApplied: boolean;
  label:
    | Readonly<Props>["input"]["sourceRows"][number]["label"]
    | Readonly<Props>["record"]["label"];
  missing: boolean;
  isChanged: boolean;
};

/** Samples the refresh record refresh state for the current authored frame. */
function _getRefreshRecordRefreshState({
  record,
  frame,
  motion,
  source,
}: Readonly<RefreshOptions>): GetRefreshRecordRefreshStateResult {
  const refresh = motion.ramp(
      frame,
      105,
      motion.scale(34),
      motion.travel.easing,
    ),
    isApplied = refresh === 1;
  const label = isApplied && source ? source.label : record.label,
    missing = isApplied && !source;
  const isChanged = source?.label !== record.label;
  return { refresh, isApplied, label, missing, isChanged };
}

/** Source labels change independently from the pinned human-state region. */
export function RefreshRecord({
  input,
  record,
  index,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const source = input.sourceRows.find(({ id }) => {
      return id === record.id;
    }),
    y = 112 + index * 106;
  const { refresh, isApplied, label, missing, isChanged } =
    _getRefreshRecordRefreshState({ record, frame, motion, source });
  const drawing = {
    record,
    frame,
    motion,
    source,
    y,
    refresh,
    isChanged,
    input,
    isApplied,
    accent,
    tokens,
    scales,
  };
  return (
    <RefreshRecordContent
      record={record}
      tokens={tokens}
      scales={scales}
      y={y}
      label={label}
      missing={missing}
      drawing={drawing}
    />
  );
}
