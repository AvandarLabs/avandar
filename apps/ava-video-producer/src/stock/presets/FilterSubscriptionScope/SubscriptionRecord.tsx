import { FitText } from "../../primitives/FitText/FitText";
import { LiteralDataText } from "../../primitives/LiteralDataText/LiteralDataText";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { getExclusionFromFrame } from "./getExclusionFromFrame";
import { SubscriptionMask } from "./SubscriptionMask";
import type { Input } from "./FilterSubscriptionScope.schema";
import type { ReactNode } from "react";

type Props = {
  record: Input["records"][number];
  rowIndex: number;
  x: number;
  width: number;
  view: Input["views"][number];
  input: Input;
  frame: number;
  accent: string;
};
/** Excluded source records are masked in subscribed tables only. */
export function SubscriptionRecord({
  record,
  rowIndex,
  x,
  width,
  view,
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const { atomic } = GraphicThemeHooks.useGraphicTheme();
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const excluded =
      view.subscribed && record.category !== input.selectedCategory,
    progress = getExclusionFromFrame({ frame, motion });
  const y = 218 + rowIndex * 48,
    opacity = excluded
      ? input.showExcludedRecords
        ? 1 - progress * atomic.opacity["70"]
        : 1 - progress
      : 1;
  return (
    <g>
      <g
        data-source-record={record.id}
        data-excluded-row={excluded ? record.id : undefined}
        opacity={opacity}
      >
        <text
          x={x + 9}
          y={y}
          fill={accent}
          fontSize={tokens.text.graphic.data.fontSize}
          fontWeight={tokens.text.graphic.data.fontWeight}
        >
          {rowIndex + 1}
        </text>
        <LiteralDataText value={record.category} x={x + 30} y={y} />
        <FitText
          text={String(record.value)}
          x={x + 30}
          y={y + 18}
          width={width - 42}
          fontSize={12}
          maxLines={2}
          normalizeWhitespace
          breakLongWords
        />
      </g>
      {excluded ? (
        <SubscriptionMask
          id={record.id}
          {...{ x, y, width, progress }}
          showExcludedRecords={input.showExcludedRecords}
        />
      ) : undefined}
    </g>
  );
}
