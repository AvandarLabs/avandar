import { propEq } from "@avandar/utils";
import { ramp } from "../../../motion";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { STOCK } from "../../stockPalette";
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
        <g opacity={ramp(frame, 91, 12)}>
          <LabelSlots
            labels={[[String(records.length), 910, y + 4, 35, 14, 1]]}
          />
          <path d={`M760 ${y + 12} H895`} stroke={STOCK.line} />
          <rect
            data-category-bar={category.id}
            x={760}
            y={y - 9}
            height={17}
            width={records.length * 16.875 * ramp(frame, 91, 41)}
            fill={accent}
            fillOpacity={0.18}
          />
          <TallyMarks {...{ input, records, y, frame, accent }} />
        </g>
      ) : null}
    </g>
  );
}
