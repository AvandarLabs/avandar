import { StockRect } from "../../primitives/StockRect/StockRect";
import { useGraphicTokens } from "../../theme/useGraphicTheme/useGraphicTheme";
import { LocalOffsetMarker } from "./LocalOffsetMarker";
import type { Input } from "./BoundedLocationDisplacement.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };
/** Local analysis contains every supplied source and authored offset. */
export function LocalDisplacementMap({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  return (
    <g data-local-map="">
      <StockRect
        x={50}
        y={174}
        width={350}
        height={250}
        fill="none"
        stroke={tokens.color.line}
      />
      {input.locations.map((location, index) => {
        return (
          <LocalOffsetMarker
            key={location.id}
            location={location}
            index={index}
            showOriginal={input.showLocalOriginal}
            frame={frame}
            accent={accent}
          />
        );
      })}
    </g>
  );
}
