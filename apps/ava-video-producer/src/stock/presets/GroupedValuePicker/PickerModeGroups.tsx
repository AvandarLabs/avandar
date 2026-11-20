import { ramp } from "../../../motion";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { StockRect } from "../../primitives/StockRect/StockRect";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { PickerValueGroup } from "./getPickerGroupsFromInput";
import type { Input } from "./GroupedValuePicker.schema";
import type { ReactNode } from "react";

type Props = {
  input: Input;
  groups: readonly PickerValueGroup[];
  frame: number;
  accent: string;
};
/** Frames the bays take to fade in. */
const BAY_FRAMES = 14;
/** Frames the counted value marks take to appear. */
const MARK_FRAMES = 2;
/** Disjoint frequency bays retain full group labels and counted value marks. */
export function PickerModeGroups({
  input,
  groups,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const motion = GraphicThemeHooks.useGraphicMotion();
  return (
    <g
      opacity={ramp(frame, 56, motion.scale(BAY_FRAMES), motion.reveal.easing)}
    >
      {groups.map((group) => {
        return (
          <g key={String(group.value)} data-mode-group={String(group.value)}>
            <StockRect
              data-mode-bay={String(group.value)}
              x={group.x}
              y={group.y}
              width={174}
              height={group.height}
              rx={scales.corner(tokens.corner.chip)}
              fill={tokens.color.surface}
              stroke={tokens.color.line}
            />
            <g
              opacity={ramp(
                frame,
                92,
                motion.press.duration,
                motion.reveal.easing,
              )}
            >
              <LabelSlots
                labels={[
                  [
                    group.value === null
                      ? input.labels.missing
                      : String(group.value),
                    group.x + 8,
                    group.y + 18,
                    156,
                    12,
                    5,
                  ],
                ]}
              />
            </g>
            {Array.from({ length: group.count }, (_, index) => {
              return (
                <StockRect
                  key={index}
                  data-frequency-token={String(group.value)}
                  x={group.x + 154}
                  y={
                    group.y +
                    (group.value === null ? 90 : 50) +
                    index * (group.value === null ? 20 : 36)
                  }
                  width={12}
                  height={8}
                  fill={accent}
                  opacity={ramp(
                    frame,
                    90,
                    motion.scale(MARK_FRAMES),
                    motion.reveal.easing,
                  )}
                />
              );
            })}
          </g>
        );
      })}
    </g>
  );
}
