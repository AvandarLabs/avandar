import { StockRect } from "../../../primitives/StockRect";
import { HumanOwnedRecordFields } from "./HumanOwnedRecordFields";
import { RefreshedSourceLabel } from "./RefreshedSourceLabel";
import { RefreshOutcomeLabel } from "./RefreshOutcomeLabel";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "../StatePreservingSourceRefresh.schema";
import type { ReactNode } from "react";

type ParentProps = {
  input: Input;
  record: Input["records"][number];
  index: number;
  frame: number;
  accent: string;
};

type GetRefreshRecordRefreshStateResult = {
  refresh: number;
  isApplied: boolean;
  label: Readonly<ParentProps>["record"]["label"];
  missing: boolean;
  isChanged: boolean;
};

type Props = {
  record: Readonly<ParentProps>["record"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
  y: number;
  label: GetRefreshRecordRefreshStateResult["label"];
  missing: GetRefreshRecordRefreshStateResult["missing"];
  drawing: {
    record: Readonly<ParentProps>["record"];
    frame: Readonly<ParentProps>["frame"];
    motion: ReturnType<typeof GraphicThemeHooks.useGraphicMotion>;
    source: Readonly<ParentProps>["input"]["sourceRows"][number] | undefined;
    y: number;
    refresh: GetRefreshRecordRefreshStateResult["refresh"];
    isChanged: GetRefreshRecordRefreshStateResult["isChanged"];
    input: Readonly<ParentProps>["input"];
    isApplied: GetRefreshRecordRefreshStateResult["isApplied"];
    accent: Readonly<ParentProps>["accent"];
    tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
    scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
  };
};

/** Renders the refresh record content in authored paint order. */
export function RefreshRecordContent(options: Readonly<Props>): ReactNode {
  return (
    <g
      data-record-row={options.record.id}
      data-label={options.label}
      data-status={options.record.status}
      data-assignee={options.record.assignee}
      data-missing={options.missing}
    >
      <StockRect
        x={50}
        y={options.y}
        width={860}
        height={98}
        rx={options.scales.corner(6)}
        fill={options.tokens.color.surface}
        stroke={options.tokens.color.line}
      />
      <RefreshedSourceLabel {...options.drawing} />
      <RefreshOutcomeLabel {...options.drawing} />
      <HumanOwnedRecordFields {...options.drawing} />
    </g>
  );
}
