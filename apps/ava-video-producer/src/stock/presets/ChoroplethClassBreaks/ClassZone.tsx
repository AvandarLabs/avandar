import { ramp, mix } from "../../../motion";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { STOCK } from "../../stockPalette";
import type { Input } from "./ChoroplethClassBreaks.schema";
import type { ReactNode } from "react";
type Props = {
  zone: Input["zones"][number];
  index: number;
  threshold: number;
  frame: number;
  accent: string;
  noDataLabel: string;
};
function _getZoneState({
  zone,
  index,
  threshold,
  frame,
  accent,
}: Readonly<Omit<Props, "noDataLabel">>) {
  const category =
    zone.value === null ? "missing" : zone.value < threshold ? "low" : "high";
  const x = 48 + (index % 3) * 152,
    y =
      154 +
      Math.floor(index / 3) * 156 +
      mix(ramp(frame, 13 + index * 2, 25), 12, 0);
  const color =
    category === "missing"
      ? STOCK.muted
      : category === "low"
        ? STOCK.cyan
        : accent;
  return { category, x, y, color };
}
/** A fixed value belongs to the class defined by the current threshold. */
export function ClassZone({
  zone,
  index,
  threshold,
  frame,
  accent,
  noDataLabel,
}: Readonly<Props>): ReactNode {
  const { category, x, y, color } = _getZoneState({
    zone,
    index,
    threshold,
    frame,
    accent,
  });
  return (
    <g
      data-zone={zone.id}
      data-value={zone.value === null ? "null" : zone.value}
      data-class={category}
      opacity={ramp(frame, 13 + index * 2, 25)}
    >
      <rect
        x={x}
        y={y}
        width={136}
        height={140}
        fill={color}
        fillOpacity={category === "high" ? 0.45 : 0.15}
        stroke={color}
        strokeDasharray={category === "missing" ? "4 5" : undefined}
      />
      <LabelSlots
        labels={[
          [zone.label, x + 10, y + 23, 116, 12, 3],
          [
            zone.value === null ? noDataLabel : String(zone.value),
            x + 10,
            y + 80,
            116,
            12,
            4,
          ],
        ]}
      />
    </g>
  );
}
