import { propEq } from "@avandar/utils";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { STOCK } from "../../stockPalette";
import type { Input } from "./PluginCapabilityInstall.schema";
import type { ReactNode } from "react";

type Props = {
  record: Input["records"][number];
  index: number;
  input: Input;
  accent: string;
};
/** Original record identity and category stay together in a fixed strip row. */
export function RetainedRecord({
  record,
  index,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  const y = 153 + index * 48;
  const category = input.categories.find(propEq("id", record.categoryId))!;
  return (
    <g data-source-record={record.id} data-source-category={record.categoryId}>
      <rect
        x={45}
        y={y}
        width={420}
        height={47}
        rx={5}
        fill={STOCK.surface}
        stroke={STOCK.line}
      />
      <circle cx={53} cy={y + 14} r={3} fill={accent} />
      {input.showRecordIds ? (
        <LabelSlots labels={[[record.id, 63, y + 12, 180, 12, 3]]} />
      ) : null}
      <LabelSlots labels={[[category.label, 250, y + 12, 205, 12, 3]]} />
    </g>
  );
}
