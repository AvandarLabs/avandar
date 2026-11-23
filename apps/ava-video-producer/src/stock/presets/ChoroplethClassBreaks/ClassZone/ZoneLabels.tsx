import { LabelSlots } from "../../../primitives/LabelSlots/LabelSlots";
import type { Input } from "../ChoroplethClassBreaks.schema";
import type { ReactNode } from "react";

type ParentProps = {
  zone: Input["zones"][number];
  index: number;
  threshold: number;
  frame: number;
  accent: string;
  noDataLabel: string;
};

type Props = {
  zone: Readonly<ParentProps>["zone"];
  noDataLabel: Readonly<ParentProps>["noDataLabel"];
  x: number;
  y: number;
};

/** Renders the zone labels in authored paint order. */
export function ZoneLabels(options: Readonly<Props>): ReactNode {
  return (
    <LabelSlots
      labels={[
        [options.zone.label, options.x + 10, options.y + 23, 116, 12, 3],
        [
          options.zone.value === null
            ? options.noDataLabel
            : String(options.zone.value),
          options.x + 10,
          options.y + 80,
          116,
          12,
          4,
        ],
      ]}
    />
  );
}
