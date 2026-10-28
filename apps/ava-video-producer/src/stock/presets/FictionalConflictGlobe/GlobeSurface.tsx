import { geoGraticule10 } from "d3-geo";
import { GlobeProjection } from "../../geography/GlobeProjection/GlobeProjection";
import { STOCK } from "../../stockPalette";
import type { ReactNode } from "react";
type Props = { longitude: number; showGraticule: boolean };
/** Pinned physical land and optional graticules share hemisphere clipping. */
export function GlobeSurface({
  longitude,
  showGraticule,
}: Readonly<Props>): ReactNode {
  const view = { centerLongitude: longitude, centerLatitude: 0, radius: 195 };
  return (
    <g
      data-globe="world"
      data-longitude={longitude}
      transform="translate(390 285)"
    >
      <circle r={195} fill={STOCK.surface} stroke={STOCK.muted} />
      {showGraticule ? (
        <path
          data-graticule="world"
          d={GlobeProjection.getPathFromGeometry({
            ...view,
            geometry: geoGraticule10(),
          })}
          fill="none"
          stroke={STOCK.line}
          strokeWidth={0.7}
        />
      ) : undefined}
      <path
        data-geography="natural-earth-land"
        d={GlobeProjection.getLandPathFromView(view)}
        fill={STOCK.elevated}
        stroke={STOCK.cyan}
        strokeWidth={0.7}
      />
    </g>
  );
}
