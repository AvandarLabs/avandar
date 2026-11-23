import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { getExclusionFromFrame } from "./getExclusionFromFrame";
import { SubscriptionMask } from "./SubscriptionMask";
import { SubscriptionSourceValue } from "./SubscriptionSourceValue/SubscriptionSourceValue";
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
      <SubscriptionSourceValue
        {...{ record, excluded, opacity, x, y, accent, tokens }}
        rowIndex={rowIndex}
        width={width}
      />
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
