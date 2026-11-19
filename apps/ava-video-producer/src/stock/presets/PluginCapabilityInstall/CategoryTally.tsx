import { propEq } from "@avandar/utils";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicMotion,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { TallyMarks } from "./TallyMarks";
import type { Input } from "./PluginCapabilityInstall.schema";
import type { ReactNode } from "react";

type Props = {
  input: Input;
  category: Input["categories"][number];
  index: number;
  frame: number;
  accent: string;
  hasTallies: boolean;
};
/** Category membership derives bars and one visible mark for each source ID. */
export function CategoryTally({
  input,
  category,
  index,
  frame,
  accent,
  hasTallies,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const motion = useGraphicMotion();
  const records = input.records.filter(propEq("categoryId", category.id));
  const y = 432 + index * 46;
  return (
    <g
      key={category.id}
      data-tally-category={category.id}
      data-category-count={hasTallies ? records.length : undefined}
    >
      <LabelSlots labels={[[category.label, 500, y + 4, 245, 12, 2]]} />
      {hasTallies ? (
        <g opacity={motion.reveal(frame, 91)}>
          <LabelSlots
            labels={[[String(records.length), 910, y + 4, 35, 14, 1]]}
          />
          <SketchedShape
            shape={{ kind: "path", d: `M760 ${y + 12} H895` }}
            profile={tokens.sketch.shape}
            stroke={tokens.color.line}
          />
          <rect
            data-category-bar={category.id}
            x={760}
            y={y - 9}
            height={17}
            width={
              records.length * 16.875 * motion.ramp(frame, 91, motion.scale(41))
            }
            fill={accent}
            fillOpacity={0.18}
          />
          <TallyMarks {...{ input, records, y, frame, accent }} />
        </g>
      ) : null}
    </g>
  );
}
