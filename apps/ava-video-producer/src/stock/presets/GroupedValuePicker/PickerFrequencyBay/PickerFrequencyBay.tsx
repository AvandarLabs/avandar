import { Motion } from "../../../../motion";
import { StockRect } from "../../../primitives/StockRect";
import { PickerModeGroupsLabels } from "../PickerModeGroupsLabels/PickerModeGroupsLabels";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { PickerValueGroup } from "../getPickerGroupsFromInput";
import type { Input } from "../GroupedValuePicker.schema";
import type { ReactNode } from "react";

const MARK_FRAMES = 2;
type Props = {
  input: Input;
  frame: number;
  accent: string;
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
  motion: ReturnType<typeof GraphicThemeHooks.useGraphicMotion>;
  group: (readonly PickerValueGroup[])[number];
};
/** Keeps frequency marks inside their keyed counting bay. */
export function PickerFrequencyBay({
  input,
  frame,
  accent,
  tokens,
  scales,
  motion,
  group,
}: Readonly<Props>): ReactNode {
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
      <PickerModeGroupsLabels {...{ frame, motion, group, input }} />
      {Array.from({ length: group.count }, (_, index) => {
        return (
          // prettier-ignore
          // Generated frequency marks occupy fixed count slots within one
          // keyed value group. They have no independent data identity.
          // react-doctor-disable-next-line no-array-index-as-key
          <StockRect
              key={index}
              data-frequency-token={String(group.value)}
              x={group.x + 154}
              y={group.y + (group.value === null ? 90 : 50) +
                index * (group.value === null ? 20 : 36)}
              width={12} height={8} fill={accent}
              opacity={Motion.ramp({ frame, at: 90,
                dur: motion.scale(MARK_FRAMES), easing: motion.reveal.easing,
              })}
            />
        );
      })}
    </g>
  );
}
