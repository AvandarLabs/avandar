import { FitText } from "../../primitives/FitText/FitText";
import { STOCK } from "../../stockPalette";
import type { Input } from "./DisclosureAperture.schema";
import type { ReactNode } from "react";
type Props = { input: Input };
/**
 * Source, destination and explicit policy legends retain their authored
 * wording.
 */
export function DisclosureCopy({ input }: Readonly<Props>): ReactNode {
  if (!input.showLabels) {
    return undefined;
  }
  const sourceX = input.direction === "left-to-right" ? 240 : 720;
  const destinationX = 960 - sourceX;
  const captions = [
    { text: input.copy.boundary, x: 480, y: 62, width: 700 },
    { text: input.copy.source, x: sourceX, y: 108, width: 350 },
    { text: input.copy.destination, x: destinationX, y: 108, width: 350 },
    { text: input.copy.retain, x: sourceX, y: 542, width: 350 },
    { text: input.copy.share, x: destinationX, y: 542, width: 350 },
    { text: input.copy.example, x: 480, y: 580, width: 700 },
  ];
  return (
    <g>
      {captions.map(({ text, x, y, width }) => (
        <FitText
          key={x + y}
          {...{ text, x, y, width }}
          fontSize={14}
          maxLines={2}
          anchor="middle"
          normalizeWhitespace
          breakLongWords
          color={STOCK.muted}
        />
      ))}
    </g>
  );
}
