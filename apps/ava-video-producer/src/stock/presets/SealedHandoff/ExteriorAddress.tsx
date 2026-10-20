import { FitText } from "../../primitives/FitText/FitText";
import { STOCK } from "../../stockPalette";
import type { Input } from "./SealedHandoff.schema";
import type { ReactNode } from "react";
type Props = { frame: number; input: Input };
/** Routing information is intentionally visible on the closed envelope. */
export function ExteriorAddress({ frame, input }: Readonly<Props>): ReactNode {
  if (
    !input.showLabels ||
    frame < 66 ||
    (input.revealRule === "recipient" && frame > 120)
  ) {
    return undefined;
  }
  const labels = [
    { text: input.address.sender, y: 64 },
    { text: input.address.recipient, y: 108 },
    ...(input.showExteriorReference
      ? [{ text: input.address.reference, y: 198 }]
      : []),
  ];
  return (
    <g data-exterior-address="routing">
      {labels.map(({ text, y }) => (
        <g key={y}>
          <rect
            x={28}
            y={y - 16}
            width={480}
            height={40}
            fill={STOCK.elevated}
          />
          <FitText
            {...{ text, y }}
            x={268}
            width={464}
            fontSize={12}
            maxLines={2}
            anchor="middle"
            normalizeWhitespace
            breakLongWords
            color={STOCK.muted}
          />
        </g>
      ))}
    </g>
  );
}
