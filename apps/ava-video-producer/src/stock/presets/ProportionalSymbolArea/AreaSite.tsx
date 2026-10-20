import { ramp, EASE } from "../../../motion";
import { AreaSiteLabels } from "./AreaSiteLabels";
import { AreaTile } from "./AreaTile";
import type { Input } from "./ProportionalSymbolArea.schema";
import type { ReactNode } from "react";
type Props = {
  site: Input["sites"][number];
  index: number;
  input: Input;
  frame: number;
  accent: string;
};
/** A site's total circle area derives from its unchanged integer value. */
export function AreaSite({
  site,
  index,
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const radius = Math.sqrt((site.value * input.areaPerUnit) / Math.PI),
    progress = ramp(frame, 51, 59, EASE.inOut);
  return (
    <g opacity={ramp(frame, 13 + index * 3, 28)}>
      {Array.from({ length: site.value }, (_, unitIndex) => (
        <AreaTile
          key={unitIndex}
          {...{ site, unitIndex, progress, radius, accent }}
          areaPerUnit={input.areaPerUnit}
        />
      ))}
      <circle
        data-symbol={site.id}
        data-area={site.value * input.areaPerUnit}
        cx={48 + site.x * 4}
        cy={148 + site.y * 4}
        r={radius}
        fill={accent}
        fillOpacity={progress === 1 ? 0.55 : 0}
        stroke={accent}
        strokeOpacity={progress}
      />
      <AreaSiteLabels {...{ site, index, input, accent }} />
    </g>
  );
}
