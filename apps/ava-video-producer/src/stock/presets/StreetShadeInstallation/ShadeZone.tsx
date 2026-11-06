import { STOCK } from "../../stockPalette";
import { SceneLabel } from "./SceneLabel";
import { ShadeFootprint } from "./ShadeFootprint";
import type { Input } from "./StreetShadeInstallation.schema";
import type { ReactNode } from "react";

type Props = { input: Input; index: number; frame: number; accent: string };
/** Zone-owned footprints preserve the complete supplied ground area. */
export function ShadeZone({
  input,
  index,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const zone = input.zones[index];
  const y = 165 + index * 65;
  return (
    <g data-zone={index} data-zone-id={zone.id}>
      <SceneLabel text={zone.label} x={45} y={y + 13} width={195} lines={3} />
      <rect
        data-ground={index}
        x={285}
        y={y}
        width={600}
        height={36}
        fill={STOCK.surface}
        stroke={accent}
      />
      <rect
        data-existing={index}
        x={285}
        y={y}
        width={(zone.existingShadeM2 / zone.areaM2) * 600}
        height={36}
        fill={STOCK.cyan}
        fillOpacity={0.3}
      />
      {input.installations.map((item, itemIndex) =>
        item.zoneId === zone.id ? (
          <ShadeFootprint
            key={item.id}
            input={input}
            index={itemIndex}
            frame={frame}
          />
        ) : undefined,
      )}
    </g>
  );
}
