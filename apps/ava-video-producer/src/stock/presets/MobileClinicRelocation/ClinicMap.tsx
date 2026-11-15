import { EASE, mix, ramp } from "../../../motion";
import { GlobeProjection } from "../../geography/GlobeProjection/GlobeProjection";
import { FitText } from "../../primitives/FitText/FitText";
import { STOCK } from "../../stockPalette";
import { ClinicVehicle } from "./ClinicVehicle";
import type { Input } from "./MobileClinicRelocation.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };
/** A schematic route preserves authored local coordinates in both contexts. */
export function ClinicMap({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const sites = input.sites.map((site) => ({
    ...site,
    x: 70 + site.x * 430,
    y: 125 + site.y * 200,
  }));
  const progress = ramp(frame, 50, 46, EASE.inOut);
  const x = mix(progress, sites[0].x, sites[1].x);
  const y = mix(progress, sites[0].y, sites[1].y);
  const awning = 1 - ramp(frame, 41, 9) + ramp(frame, 96, 17);
  return (
    <g>
      {input.view === "globe-to-local" ? (
        <g transform="translate(565 136)" opacity={1 - ramp(frame, 36, 24)}>
          <circle r={35} fill={STOCK.surface} stroke={STOCK.line} />
          <path
            d={GlobeProjection.getLandPathFromView({
              centerLongitude: 20,
              centerLatitude: 0,
              radius: 35,
            })}
            fill={STOCK.muted}
          />
        </g>
      ) : undefined}
      <path
        d={`M${sites[0].x} ${sites[0].y} L${sites[1].x} ${sites[1].y}`}
        stroke={STOCK.line}
        strokeWidth={18}
        strokeLinecap="round"
      />
      <path
        d={`M${sites[0].x} ${sites[0].y} L${sites[1].x} ${sites[1].y}`}
        stroke={STOCK.muted}
        strokeDasharray="5 10"
        fill="none"
      />
      {sites.map((site, index) => (
        <g key={site.id}>
          <circle
            data-site-id={site.id}
            cx={site.x}
            cy={site.y}
            r={9}
            fill={STOCK.surface}
            stroke={accent}
          />
          <FitText
            text={site.label}
            x={500}
            y={190 + index * 70}
            width={110}
            fontSize={12}
            maxLines={4}
            breakLongWords
            normalizeWhitespace
          />
          <path
            d={`M490 ${190 + index * 70} L${site.x} ${site.y}`}
            stroke={STOCK.line}
          />
        </g>
      ))}
      <ClinicVehicle x={x} y={y} awning={awning} accent={accent} />
    </g>
  );
}
