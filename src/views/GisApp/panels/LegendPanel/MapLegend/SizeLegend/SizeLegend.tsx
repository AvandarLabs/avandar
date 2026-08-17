import { useLingui } from "@lingui/react/macro";
import css from "@/views/GisApp/panels/LegendPanel/MapLegend/SizeLegend/SizeLegend.module.css";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { ReactNode } from "react";

type Props = {
  sizeStops: readonly MapLayer.SizeLegendStop[];
};

/**
 * Renders frozen proportional-symbol stops as bottom-aligned nested circles.
 */
export function SizeLegend({ sizeStops }: Props): ReactNode {
  const { t } = useLingui();
  const maxRadius = Math.max(
    ...sizeStops.map((stop) => {
      return stop.radiusPx;
    }),
  );
  const bottom = maxRadius * 2;
  const labelX = maxRadius * 2 + 12;
  const firstLabel = sizeStops.at(0)?.label ?? "";
  const lastLabel = sizeStops.at(-1)?.label ?? "";
  const accessibleLabel =
    sizeStops.length === 1 ?
      t`Symbol size ${firstLabel}`
    : t`Symbol sizes from ${firstLabel} to ${lastLabel}`;

  return (
    <svg
      aria-label={accessibleLabel}
      className={css.sizeLegend}
      role="img"
      viewBox={`0 0 ${labelX + 72} ${bottom + 4}`}
    >
      {sizeStops.map((stop) => {
        const centerY = bottom - stop.radiusPx;
        return (
          <g key={`${stop.value}-${stop.radiusPx}-${stop.label}`}>
            <circle
              className={css.sizeLegendCircle}
              cx={maxRadius}
              cy={centerY}
              r={stop.radiusPx}
            />
            <line
              className={css.sizeLegendLeader}
              x1={maxRadius + stop.radiusPx}
              x2={labelX}
              y1={centerY}
              y2={centerY}
            />
            <text
              className={css.sizeLegendLabel}
              dominantBaseline="middle"
              x={labelX + 4}
              y={centerY}
            >
              {stop.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
