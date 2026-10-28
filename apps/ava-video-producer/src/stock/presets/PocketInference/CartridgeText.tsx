import { FitText } from "../../primitives/FitText/FitText";
import { STOCK } from "../../stockPalette";
import type { Input } from "./PocketInference.schema";
import type { ReactNode } from "react";
type Props = { input: Input; y: number };
/** Model identity and optional detail sit on the resident cartridge face. */
export function CartridgeText({ input, y }: Readonly<Props>): ReactNode {
  if (!input.showLabels) {
    return (
      <path
        d={`M220 ${y + 28} h240 M544 ${y + 28} h164`}
        stroke={STOCK.muted}
        strokeWidth={3}
      />
    );
  }
  const labels = [
    {
      text: input.model.label,
      x: 220,
      y: y + 24,
      width: 300,
      fontSize: 14 as const,
      maxLines: 2,
      color: STOCK.text,
    },
    {
      text: input.model.detail,
      x: 544,
      y: y + 18,
      width: 198,
      fontSize: 12 as const,
      maxLines: 3,
      color: STOCK.muted,
    },
  ];
  return (
    <g>
      {labels.map((label) => (
        <FitText key={label.x} {...label} normalizeWhitespace breakLongWords />
      ))}
    </g>
  );
}
