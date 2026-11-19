import { StockRect } from "../../primitives/StockRect/StockRect";
import {
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { SceneLabel } from "./SceneLabel";
import { ShadeFootprint } from "./ShadeFootprint";
import type { Input } from "./StreetShadeInstallation.schema";
import type { ReactNode } from "react";

/** The existing shade's tint, before the theme's tint strength. */
const EXISTING_SHADE_TINT = 0.3;
type Props = { input: Input; index: number; frame: number; accent: string };
/** Zone-owned footprints preserve the complete supplied ground area. */
export function ShadeZone({
  input,
  index,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
  const zone = input.zones[index];
  const y = 165 + index * 65;
  return (
    <g data-zone={index} data-zone-id={zone.id}>
      <SceneLabel text={zone.label} x={45} y={y + 13} width={195} lines={3} />
      <StockRect
        data-ground={index}
        x={285}
        y={y}
        width={600}
        height={36}
        fill={tokens.color.surface}
        stroke={accent}
      />
      <rect
        data-existing={index}
        x={285}
        y={y}
        width={(zone.existingShadeM2 / zone.areaM2) * 600}
        height={36}
        fill={tokens.color.accentAlt}
        fillOpacity={scales.wash(EXISTING_SHADE_TINT)}
      />
      {input.installations.map((item, itemIndex) => {
        return item.zoneId === zone.id ? (
          <ShadeFootprint
            key={item.id}
            input={input}
            index={itemIndex}
            frame={frame}
          />
        ) : undefined;
      })}
    </g>
  );
}
