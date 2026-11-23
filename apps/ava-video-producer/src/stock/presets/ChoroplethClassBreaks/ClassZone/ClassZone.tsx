import { Motion } from "../../../../motion";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { ZoneLabels } from "./ZoneLabels";
import { ZoneSurface } from "./ZoneSurface";
import type { Input } from "../ChoroplethClassBreaks.schema";
import type { ReactNode } from "react";

type Props = {
  zone: Input["zones"][number];
  index: number;
  threshold: number;
  frame: number;
  accent: string;
  noDataLabel: string;
};
/** The authored zone classification and its sampled presentation geometry. */
type ZoneState = {
  category: Parameters<typeof ZoneSurface>[0]["category"];
  x: number;
  y: number;
  color: string;
};

type GetClassZoneArrivalStateOptions = {
  zone: Readonly<Props>["zone"];
  index: Readonly<Props>["index"];
  threshold: Readonly<Props>["threshold"];
  frame: Readonly<Props>["frame"];
  accent: Readonly<Props>["accent"];
  colors: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>["color"];
  motion: ReturnType<typeof GraphicThemeHooks.useGraphicMotion>;
};

type GetClassZoneArrivalStateResult = {
  arrival: number;
  category: ReturnType<typeof _getZoneState>["category"];
  x: ReturnType<typeof _getZoneState>["x"];
  y: ReturnType<typeof _getZoneState>["y"];
  color: ReturnType<typeof _getZoneState>["color"];
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
    colors: Readonly<{
      inactive: string;
      accentAlt: string;
    }>;
    arrival: number;
    rise: number;
  }
>): ZoneState {
  const category =
    zone.value === null ? "missing" : zone.value < threshold ? "low" : "high";
  const x = 48 + (index % 3) * 152,
    y =
      154 +
      Math.floor(index / 3) * 156 +
      Motion.mix({
        t: arrival,
        from: rise,
        to: 0,
      });
  const color =
    category === "missing"
      ? colors.inactive
      : category === "low"
        ? colors.accentAlt
        : accent;
  return { category, x, y, color };
}

/** Samples the class zone arrival state for the current authored frame. */
function _getClassZoneArrivalState({
  zone,
  index,
  threshold,
  frame,
  accent,
  colors,
  motion,
}: Readonly<GetClassZoneArrivalStateOptions>): GetClassZoneArrivalStateResult {
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
  return { arrival, category, x, y, color };
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
  const { color: colors, stroke } = GraphicThemeHooks.useGraphicTokens();
  const { atomic } = GraphicThemeHooks.useGraphicTheme();
  const shapes = GraphicThemeHooks.useGraphicShapeScales();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const { arrival, category, x, y, color } = _getClassZoneArrivalState({
    zone,
    index,
    threshold,
    frame,
    accent,
    colors,
    motion,
  });
  return (
    <g
      data-zone={zone.id}
      data-value={zone.value === null ? "null" : zone.value}
      data-class={category}
      opacity={arrival}
    >
      <ZoneSurface
        stroke={stroke}
        atomic={atomic}
        shapes={shapes}
        category={category}
        x={x}
        y={y}
        color={color}
      />
      <ZoneLabels zone={zone} noDataLabel={noDataLabel} x={x} y={y} />
    </g>
  );
}
