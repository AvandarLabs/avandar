import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import type { Input } from "./ProportionalSymbolArea.schema";
import type { ReactNode } from "react";

type Props = {
  site: Input["sites"][number];
  index: number;
  input: Input;
  accent: string;
};
/** A fixed site key binds its circle to the complete source label and value. */
export function AreaSiteLabels({
  site,
  index,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      <LabelSlots
        labels={[
          [`${index + 1} · ${site.label}`, 516, 171 + index * 68, 396, 14, 2],
          [
            `${site.value} ${input.unitLabel}`,
            516,
            210 + index * 68,
            396,
            12,
            2,
          ],
        ]}
      />
      <text
        x={48 + site.x * 4}
        y={152 + site.y * 4}
        textAnchor="middle"
        fill={accent}
        fontSize={12}
      >
        {index + 1}
      </text>
    </g>
  );
}
