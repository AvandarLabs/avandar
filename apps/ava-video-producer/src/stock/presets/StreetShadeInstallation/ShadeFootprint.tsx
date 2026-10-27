import { propEq } from "@avandar/utils";
import { ramp, EASE } from "../../../motion";
import { INSTALLATION_COLORS } from "./installationColors";
import { ShadeStructure } from "./ShadeStructure";
import type { Input } from "./StreetShadeInstallation.schema";
import type { ReactNode } from "react";
type Props = { input: Input; index: number; frame: number };
/** One authored object retains its distinct footprint and visible key. */
export function ShadeFootprint({
  input,
  index,
  frame,
}: Readonly<Props>): ReactNode {
  const item = input.installations[index];
  const zoneIndex = input.zones.findIndex(propEq("id", item.zoneId));
  const zone = input.zones[zoneIndex];
  const preceding = input.installations
    .slice(0, index)
    .filter(propEq("zoneId", item.zoneId))
    .reduce((sum, prior) => sum + prior.addedShadeM2, 0);
  const x = 285 + ((zone.existingShadeM2 + preceding) / zone.areaM2) * 600;
  const y = 165 + zoneIndex * 65;
  const width =
    (item.addedShadeM2 / zone.areaM2) *
    600 *
    ramp(frame, 36 + index * 4, 60, EASE.inOut);
  const color = INSTALLATION_COLORS[index];
  const isInstalled = input.decision.stage === "installed";
  return (
    <g data-installation-id={item.id}>
      <rect
        data-footprint={index}
        x={x}
        y={y}
        width={width}
        height={36}
        fill={color}
        fillOpacity={isInstalled ? 0.34 : 0.06}
        stroke={width > 0 ? color : undefined}
        strokeWidth={1}
        strokeDasharray={isInstalled ? undefined : "3 3"}
      />
      <ShadeStructure
        kind={item.kind}
        index={index}
        x={x}
        y={y}
        width={width}
        isInstalled={isInstalled}
        color={color}
      />
    </g>
  );
}
