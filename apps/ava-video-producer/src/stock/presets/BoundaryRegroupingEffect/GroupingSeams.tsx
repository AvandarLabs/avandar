import { ramp } from "../../../motion";
import { STOCK } from "../../stockPalette";
import { buildZoneOutlineFromCells } from "./buildZoneOutlineFromCells";
import { getGroupingFromCells } from "./getGroupingFromCells";
import type { Input } from "./BoundaryRegroupingEffect.schema";
import type { ReactNode } from "react";
type Props = { input: Input; frame: number; accent: string };
/** Raised group seams leave the atomic grid fixed below them. */
export function GroupingSeams({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      {[0, 1].map((index) => (
        <g
          key={index}
          data-seam-partition={index}
          transform={`translate(0 ${index === 0 ? -28 * ramp(frame, 36, 36) : -28 * (1 - ramp(frame, 72, 36))})`}
          opacity={index === 0 ? 1 - ramp(frame, 60, 12) : ramp(frame, 72, 36)}
        >
          {getGroupingFromCells({ input, index }).map((zone) => (
            <path
              key={zone.id}
              data-zone-outline={zone.id}
              d={buildZoneOutlineFromCells(zone.cells)}
              fill="none"
              stroke={[accent, STOCK.cyan, STOCK.orange][zone.zoneIndex]}
              strokeWidth={4}
            />
          ))}
        </g>
      ))}
    </g>
  );
}
