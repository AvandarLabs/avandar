import { mix } from "../../../motion";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { StockRect } from "../../primitives/StockRect/StockRect";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import {
  HIGH_CLASS_FILL_ALPHA,
  MISSING_DASH,
  QUIET_CLASS_FILL_ALPHA,
} from "./ChoroplethClassBreaks.constants";
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

const ZONE_AT = 13;
const ZONE_FRAMES = 25;

function _getZoneState({
  zone,
  index,
  threshold,
  accent,
  colors,
  arrival,
  rise,
}: Readonly<
  Omit<Props, "noDataLabel" | "frame"> & {
    colors: Readonly<{ inactive: string; accentAlt: string }>;
    arrival: number;
    rise: number;
  }
>) {
  const category =
    zone.value === null ? "missing" : zone.value < threshold ? "low" : "high";
  const x = 48 + (index % 3) * 152,
    y = 154 + Math.floor(index / 3) * 156 + mix(arrival, rise, 0);
  const color =
    category === "missing"
      ? colors.inactive
      : category === "low"
        ? colors.accentAlt
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
  const { color: colors, stroke } = useGraphicTokens();
  const shapes = useGraphicShapeScales();
  const motion = useGraphicMotion();
  const arrival = motion.ramp(
    frame,
    ZONE_AT + index * motion.stagger.list,
    motion.scale(ZONE_FRAMES),
  );
  const { category, x, y, color } = _getZoneState({
    zone,
    index,
    threshold,
    accent,
    colors,
    arrival,
    rise: motion.entrance.distance,
  });
  return (
    <g
      data-zone={zone.id}
      data-value={zone.value === null ? "null" : zone.value}
      data-class={category}
      opacity={arrival}
    >
      <StockRect
        x={x}
        y={y}
        width={136}
        height={140}
        fill={color}
        fillOpacity={
          category === "high" ? HIGH_CLASS_FILL_ALPHA : QUIET_CLASS_FILL_ALPHA
        }
        stroke={color}
        strokeDasharray={category === "missing" ? MISSING_DASH : undefined}
        strokeWidth={shapes.stroke(stroke.hairline)}
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
