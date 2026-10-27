import { FitText } from "../../primitives/FitText/FitText";
import { type FitTextSize } from "../../primitives/FitText/wrapTextToLines";
import { STOCK } from "../../stockPalette";
import type { Input } from "./ConvoyRouteDetour.schema";
import type { ReactNode } from "react";

type Props = { input: Input; accent: string };
/** Fixed label rails stay outside the complete authored road region. */
export function ConvoyCopy({ input, accent }: Readonly<Props>): ReactNode {
  const labels: Array<[string, number, number, number, FitTextSize, string]> = [
    [input.scenarioCaption, 40, 38, 880, 16, STOCK.text],
    [input.locations.depotLabel, 65, 95, 245, 14, STOCK.text],
    [input.locations.destinationLabel, 365, 95, 245, 14, STOCK.text],
    [input.locations.junctionLabel, 665, 95, 245, 14, STOCK.text],
    [input.obstruction.label, 40, 505, 280, 14, STOCK.orange],
  ];
  return (
    <g>
      {labels.map(([text, x, y, width, fontSize, color], index) => (
        <FitText
          key={index}
          text={text}
          x={x}
          y={y}
          width={width}
          fontSize={fontSize}
          maxLines={3}
          color={color}
          normalizeWhitespace
          breakLongWords
        />
      ))}
      {[0, 1, 2].map((index) => (
        <text
          key={index}
          x={40 + index * 300}
          y={95}
          fill={STOCK.cyan}
          fontSize={14}
        >
          {index + 1}
        </text>
      ))}
      {input.showRouteLabels
        ? input.routes.map((route, index) => (
            <FitText
              key={route.role}
              text={route.label}
              x={350 + index * 300}
              y={505}
              width={270}
              fontSize={14}
              maxLines={3}
              color={route.role === "detour" ? accent : STOCK.muted}
              normalizeWhitespace
              breakLongWords
            />
          ))
        : undefined}
    </g>
  );
}
