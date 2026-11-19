import { propEq } from "@avandar/utils";
import { StockRect } from "../../primitives/StockRect/StockRect";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { INSTALLATION_CATEGORIES } from "./installationColors";
import { ShadeStructure } from "./ShadeStructure";
import type { Input } from "./StreetShadeInstallation.schema";
import type { ReactNode } from "react";

/** The dash of a footprint that is planned but not installed. */
const PLANNED_DASH = "3 3";
/** An installed footprint's tint, before the theme's tint strength. */
const INSTALLED_TINT = 0.34;
/** A planned footprint's tint, before the theme's tint strength. */
const PLANNED_TINT = 0.06;
type Props = { input: Input; index: number; frame: number };
/** One authored object retains its distinct footprint and visible key. */
export function ShadeFootprint({
  input,
  index,
  frame,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const motion = useGraphicMotion();
  const scales = useGraphicShapeScales();
  const item = input.installations[index];
  const zoneIndex = input.zones.findIndex(propEq("id", item.zoneId));
  const zone = input.zones[zoneIndex];
  const preceding = input.installations
    .slice(0, index)
    .filter(propEq("zoneId", item.zoneId))
    .reduce((sum, prior) => {
      return sum + prior.addedShadeM2;
    }, 0);
  const x = 285 + ((zone.existingShadeM2 + preceding) / zone.areaM2) * 600;
  const y = 165 + zoneIndex * 65;
  const width =
    (item.addedShadeM2 / zone.areaM2) *
    600 *
    motion.ramp(frame, 36 + index * 4, motion.scale(60), motion.travel.easing);
  const color = tokens.color.categorical[INSTALLATION_CATEGORIES[index]];
  const isInstalled = input.decision.stage === "installed";
  return (
    <g data-installation-id={item.id}>
      <StockRect
        data-footprint={index}
        x={x}
        y={y}
        width={width}
        height={36}
        fill={color}
        fillOpacity={scales.wash(isInstalled ? INSTALLED_TINT : PLANNED_TINT)}
        stroke={width > 0 ? color : undefined}
        strokeWidth={scales.stroke(tokens.stroke.hairline)}
        strokeDasharray={isInstalled ? undefined : PLANNED_DASH}
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
