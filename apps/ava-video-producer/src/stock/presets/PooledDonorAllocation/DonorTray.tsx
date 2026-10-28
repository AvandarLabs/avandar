import { PersonGlyph } from "../../primitives/PersonGlyph/PersonGlyph";
import { STOCK } from "../../stockPalette";
import { getDonorTrayFromInputAndFrame } from "./getDonorTrayFromInputAndFrame";
import type { Input } from "./PooledDonorAllocation.schema";
import type { ReactNode } from "react";
type Props = { input: Input; frame: number; donorIndex: number };

/** The contributor's hand tips a small supported stack into the shared tray. */
export function DonorTray({
  input,
  frame,
  donorIndex,
}: Readonly<Props>): ReactNode {
  const tray = getDonorTrayFromInputAndFrame({ input, frame, donorIndex });
  const length = (input.contributions[donorIndex].credits - 1) * 32;
  const rightX = tray.x - 20 + (length + 40) * tray.cosine;
  const rightY = tray.y + (length + 40) * tray.sine + 22;
  return (
    <g>
      <PersonGlyph x={tray.x - 24} y={164} size={26} color={STOCK.muted} />
      <path
        data-donor-tray={donorIndex}
        d={`M${tray.x - 20} ${tray.y + 16} L${tray.x - 20} ${tray.y + 22} L${rightX} ${rightY} L${rightX} ${rightY - 6}`}
        fill="none"
        stroke={STOCK.muted}
        strokeWidth={2}
      />
      <path
        d={`M${tray.x - 24} 164 L${tray.x - 30} 175 L${tray.x - 20} ${tray.y + 22}`}
        fill="none"
        stroke={STOCK.muted}
        strokeWidth={2}
      />
      <circle
        data-donor-hand={donorIndex}
        cx={tray.x - 20}
        cy={tray.y + 22}
        r={3}
        fill={STOCK.muted}
      />
    </g>
  );
}
