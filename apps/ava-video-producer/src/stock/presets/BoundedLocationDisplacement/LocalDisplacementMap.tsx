import { STOCK } from "../../stockPalette";
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
  return (
    <g data-local-map="">
      <rect
        x={50}
        y={174}
        width={350}
        height={250}
        fill="none"
        stroke={STOCK.line}
      />
      {input.locations.map((location, index) => (
        <LocalOffsetMarker
          key={location.id}
          location={location}
          index={index}
          showOriginal={input.showLocalOriginal}
          frame={frame}
          accent={accent}
        />
      ))}
    </g>
  );
}
